-- ============================================================
-- HouseHunt NG - 003 Phase 2: listings, media storage, moderation
-- Run AFTER 002_security_hardening.sql. Safe to run more than once.
-- ============================================================

-- ---------- new columns ----------
alter table houses            add column if not exists rejection_reason text;
alter table landlord_profiles add column if not exists rejection_reason text;

-- ============================================================
-- STORAGE BUCKETS
--   house-media    public   photos + 360 images (10 MB each)
--   house-videos   public   clips (150 MB each). URLs are unguessable UUID paths;
--                           Phase 6 can move these to signed URLs.
--   landlord-docs  PRIVATE  ID documents (owner + admin only)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('house-media',   'house-media',   true,  10485760,  array['image/jpeg','image/png','image/webp']),
  ('house-videos',  'house-videos',  true,  157286400, array['video/mp4','video/webm','video/quicktime']),
  ('landlord-docs', 'landlord-docs', false, 5242880,  array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Files must live in a folder named after the uploader's user id: <uid>/<house>/<file>
drop policy if exists "hh landlord upload own folder" on storage.objects;
drop policy if exists "hh landlord delete own files"  on storage.objects;
drop policy if exists "hh owner read landlord docs"   on storage.objects;
drop policy if exists "hh owner read own files"       on storage.objects;
drop policy if exists "hh admin all hh buckets"       on storage.objects;

create policy "hh landlord upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('house-media', 'house-videos', 'landlord-docs')
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'landlord')
  );

create policy "hh landlord delete own files" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('house-media', 'house-videos', 'landlord-docs')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owners can see their own files (the storage API needs this for uploads/deletes/listing).
-- landlord-docs stays private: nobody else can read another landlord's folder.
create policy "hh owner read own files" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('house-media', 'house-videos', 'landlord-docs')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "hh admin all hh buckets" on storage.objects
  for all to authenticated
  using (bucket_id in ('house-media', 'house-videos', 'landlord-docs') and public.is_admin())
  with check (bucket_id in ('house-media', 'house-videos', 'landlord-docs') and public.is_admin());

-- ============================================================
-- VIDEO RULES (enforced in the database, values come from app_config)
-- NOTE: duration is reported by the browser, so admin review remains the real check.
--       File SIZE and TYPE are enforced by the storage bucket itself.
-- ============================================================
create or replace function public.enforce_max_videos()
returns trigger
language plpgsql
as $$
declare
  v_max   integer := coalesce((select value::integer from public.app_config where key = 'max_videos'), 3);
  v_count integer;
begin
  select count(*) into v_count from public.house_videos where house_id = new.house_id;
  if v_count >= v_max then
    raise exception 'Maximum of % videos allowed per house', v_max;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_video_limits()
returns trigger
language plpgsql
as $$
declare
  v_max_secs integer := coalesce((select value::integer from public.app_config where key = 'max_video_seconds'), 180);
  v_max_mb   integer := coalesce((select value::integer from public.app_config where key = 'max_video_size_mb'), 150);
begin
  if new.duration_sec is null or new.duration_sec <= 0 then
    raise exception 'Video duration is required';
  end if;
  if new.duration_sec > v_max_secs then
    raise exception 'Video must be at most % seconds', v_max_secs;
  end if;
  if new.size_bytes is null or new.size_bytes > v_max_mb::bigint * 1024 * 1024 then
    raise exception 'Video must be at most % MB', v_max_mb;
  end if;
  if coalesce(trim(new.area_label), '') = '' then
    raise exception 'Video area label is required';
  end if;
  return new;
end;
$$;
drop trigger if exists trigger_enforce_video_limits on house_videos;
create trigger trigger_enforce_video_limits
  before insert or update on house_videos
  for each row execute function public.enforce_video_limits();

-- Public only sees APPROVED clips (landlords/admins see all of theirs via other policies)
drop policy if exists "house_videos public read" on house_videos;
create policy "house_videos public read" on house_videos
  for select using (
    status = 'approved'
    and exists (
      select 1 from houses
      where houses.id = house_videos.house_id
        and houses.approval_status = 'approved'
        and houses.is_available = true
    )
  );

-- ============================================================
-- HOUSE MODERATION
-- ============================================================
-- Landlords cannot change approval status or the rejection reason.
-- Editing price/location/type/category of an APPROVED listing sends it back for re-approval
-- (prevents bait-and-switch). Remove the 'material change' block if you prefer otherwise.
create or replace function public.guard_house_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not public.is_admin()
     and coalesce(current_setting('app.bypass_guard', true), '') <> 'on' then
    if tg_op = 'INSERT' then
      new.approval_status := 'pending';
      new.rejection_reason := null;
    else
      new.landlord_id := old.landlord_id;
      new.rejection_reason := old.rejection_reason;
      new.approval_status := old.approval_status;
      if old.approval_status = 'approved' and (
           new.annual_rent_kobo is distinct from old.annual_rent_kobo
        or new.location_text    is distinct from old.location_text
        or new.city             is distinct from old.city
        or new.house_type       is distinct from old.house_type
        or new.category_id      is distinct from old.category_id
      ) then
        new.approval_status := 'pending';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- A listing can only be approved if its landlord has been verified (even by an admin)
create or replace function public.require_verified_landlord()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approval_status = 'approved'
     and (tg_op = 'INSERT' or old.approval_status is distinct from 'approved') then
    if not exists (select 1 from landlord_profiles where user_id = new.landlord_id and verified) then
      raise exception 'Landlord must be verified before a listing can be approved';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists require_verified_landlord on houses;
create trigger require_verified_landlord
  before insert or update on houses
  for each row execute function public.require_verified_landlord();

-- Landlord resubmits a rejected listing for review (the only way a landlord changes status)
create or replace function public.resubmit_house(p_house_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  perform set_config('app.bypass_guard', 'on', true);
  update houses
     set approval_status = 'pending', rejection_reason = null
   where id = p_house_id and landlord_id = auth.uid() and approval_status = 'rejected';
  get diagnostics v_rows = row_count;   -- must come right after the UPDATE (PERFORM resets FOUND)
  perform set_config('app.bypass_guard', 'off', true);
  if v_rows = 0 then
    raise exception 'Nothing to resubmit';
  end if;
end;
$$;
grant execute on function public.resubmit_house(uuid) to authenticated;

-- Landlords may delete their own pending/rejected listings that have no agreements
drop policy if exists "houses landlord delete draft" on houses;
create policy "houses landlord delete draft" on houses
  for delete using (
    auth.uid() = landlord_id
    and approval_status in ('pending', 'rejected')
    and not exists (select 1 from agreements a where a.house_id = houses.id)
  );

-- ============================================================
-- LANDLORD VERIFICATION
-- ============================================================
create or replace function public.lock_landlord_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not public.is_admin()
     and coalesce(current_setting('app.bypass_guard', true), '') <> 'on' then
    new.user_id := old.user_id;
    new.verified := old.verified;
    new.paystack_recipient_code := old.paystack_recipient_code;
    new.rejection_reason := old.rejection_reason;
  end if;
  return new;
end;
$$;

-- A rejected landlord fixes their details, then asks for a fresh review
create or replace function public.resubmit_verification()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  perform set_config('app.bypass_guard', 'on', true);
  update landlord_profiles
     set rejection_reason = null
   where user_id = auth.uid() and verified = false and rejection_reason is not null;
  get diagnostics v_rows = row_count;
  perform set_config('app.bypass_guard', 'off', true);
  if v_rows = 0 then
    raise exception 'Nothing to resubmit';
  end if;
end;
$$;
grant execute on function public.resubmit_verification() to authenticated;
