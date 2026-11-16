-- ============================================================
-- HouseHunt NG - 002 security hardening
-- Run AFTER schema.sql, BEFORE seed.sql. Safe to run more than once.
--
-- Fixes:
--  1. Users could set their own role to 'admin'
--  2. Everyone (even logged out) could read all emails/phones
--  3. Users could write directly to payments/agreements
--  4. Landlords could approve their own listings / verify themselves,
--     and verified landlords' ID + bank details were publicly readable
--  5. Profiles were created from the browser (broke with email confirmation)
--
-- Convention: the SQL editor and edge functions (service role) have
-- auth.uid() = null, so they are allowed to change locked columns.
-- ============================================================

-- ---------- helper: admin check (SECURITY DEFINER avoids RLS recursion) ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ============================================================
-- PROFILES
-- ============================================================
drop policy if exists "profiles public read" on profiles;
drop policy if exists "profiles own write" on profiles;
drop policy if exists "profiles own read" on profiles;
drop policy if exists "profiles admin read" on profiles;
drop policy if exists "profiles own update" on profiles;
drop policy if exists "profiles admin update" on profiles;

create policy "profiles own read" on profiles
  for select using (auth.uid() = id);
create policy "profiles admin read" on profiles
  for select using (public.is_admin());
create policy "profiles own update" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles admin update" on profiles
  for update using (public.is_admin()) with check (public.is_admin());
-- No insert/delete policy: rows are created by the handle_new_user trigger.

-- Role, email and id can never be changed by the user themselves
create or replace function public.lock_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.id := old.id;
    new.role := old.role;
    new.email := old.email;
  end if;
  return new;
end;
$$;
drop trigger if exists lock_profile_columns on profiles;
create trigger lock_profile_columns
  before update on profiles
  for each row execute function public.lock_profile_columns();

alter table profiles drop constraint if exists profiles_username_format;
alter table profiles add constraint profiles_username_format
  check (username ~ '^[A-Za-z0-9_]{3,20}$') not valid;

-- ---------- create profile automatically on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  -- Only tenant or landlord can be self-selected. Admin is NEVER possible here.
  v_role     text  := case when v_meta->>'role' = 'landlord' then 'landlord' else 'tenant' end;
  v_username text  := coalesce(nullif(trim(v_meta->>'username'), ''), split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, username, full_name, email, phone, role)
  values (
    new.id,
    v_username,
    coalesce(nullif(trim(v_meta->>'full_name'), ''), v_username),
    new.email,
    coalesce(v_meta->>'phone', ''),
    v_role
  );

  if v_role = 'landlord' then
    insert into public.landlord_profiles (user_id) values (new.id);
  end if;

  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- username helpers used by the login/signup screens ----------
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(p_username));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- (resolve_username_to_email already exists in schema.sql; it still returns an email to
--  anonymous callers. Phase 5 replaces it with a rate-limited edge function.)
grant execute on function public.resolve_username_to_email(text) to anon, authenticated;

-- ============================================================
-- LANDLORD PROFILES (DOB, ID document and bank details are private)
-- ============================================================
drop policy if exists "landlord_profiles public read verified" on landlord_profiles;
drop policy if exists "landlord_profiles owner manage" on landlord_profiles;
drop policy if exists "landlord_profiles owner read" on landlord_profiles;
drop policy if exists "landlord_profiles owner update" on landlord_profiles;
drop policy if exists "landlord_profiles admin all" on landlord_profiles;

create policy "landlord_profiles owner read" on landlord_profiles
  for select using (auth.uid() = user_id);
create policy "landlord_profiles owner update" on landlord_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "landlord_profiles admin all" on landlord_profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Landlords cannot verify themselves or set their own payout recipient
create or replace function public.lock_landlord_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.user_id := old.user_id;
    new.verified := old.verified;
    new.paystack_recipient_code := old.paystack_recipient_code;
  end if;
  return new;
end;
$$;
drop trigger if exists lock_landlord_columns on landlord_profiles;
create trigger lock_landlord_columns
  before update on landlord_profiles
  for each row execute function public.lock_landlord_columns();

-- Safe public view: first name + verified badge only (no contact details)
create or replace view public.public_landlords as
  select p.id,
         split_part(p.full_name, ' ', 1) as first_name,
         coalesce(l.verified, false)     as verified
  from public.profiles p
  left join public.landlord_profiles l on l.user_id = p.id
  where p.role = 'landlord';
grant select on public.public_landlords to anon, authenticated;

-- ============================================================
-- HOUSES (landlords cannot approve their own listings)
-- ============================================================
drop policy if exists "houses landlord manage own" on houses;
drop policy if exists "houses landlord read own" on houses;
drop policy if exists "houses landlord insert" on houses;
drop policy if exists "houses landlord update" on houses;
drop policy if exists "houses admin all" on houses;

create policy "houses landlord read own" on houses
  for select using (auth.uid() = landlord_id);
create policy "houses landlord insert" on houses
  for insert with check (
    auth.uid() = landlord_id
    and exists (select 1 from profiles where id = auth.uid() and role = 'landlord')
  );
create policy "houses landlord update" on houses
  for update using (auth.uid() = landlord_id) with check (auth.uid() = landlord_id);
create policy "houses admin all" on houses
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.guard_house_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.approval_status := 'pending';
    else
      new.approval_status := old.approval_status;
      new.landlord_id := old.landlord_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_house_approval on houses;
create trigger guard_house_approval
  before insert or update on houses
  for each row execute function public.guard_house_approval();

-- ============================================================
-- HOUSE VIDEOS (landlords cannot self-approve clips)
-- ============================================================
create or replace function public.guard_video_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending_review';
    else
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_video_status on house_videos;
create trigger guard_video_status
  before insert or update on house_videos
  for each row execute function public.guard_video_status();

-- ============================================================
-- INSPECTIONS
-- ============================================================
drop policy if exists "inspections tenant own" on inspections;
drop policy if exists "inspections landlord own houses" on inspections;
drop policy if exists "inspections admin all" on inspections;
drop policy if exists "inspections tenant read" on inspections;
drop policy if exists "inspections tenant insert" on inspections;
drop policy if exists "inspections landlord read" on inspections;
drop policy if exists "inspections landlord update" on inspections;

create policy "inspections tenant read" on inspections
  for select using (auth.uid() = tenant_id);
create policy "inspections tenant insert" on inspections
  for insert with check (
    auth.uid() = tenant_id
    and exists (
      select 1 from houses h
      where h.id = inspections.house_id and h.approval_status = 'approved' and h.is_available
    )
  );
create policy "inspections landlord read" on inspections
  for select using (
    exists (select 1 from houses h where h.id = inspections.house_id and h.landlord_id = auth.uid())
  );
create policy "inspections landlord update" on inspections
  for update using (
    exists (select 1 from houses h where h.id = inspections.house_id and h.landlord_id = auth.uid())
  ) with check (
    exists (select 1 from houses h where h.id = inspections.house_id and h.landlord_id = auth.uid())
  );
create policy "inspections admin all" on inspections
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.guard_inspection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.scheduled_at := null;
    else
      new.house_id := old.house_id;
      new.tenant_id := old.tenant_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_inspection on inspections;
create trigger guard_inspection
  before insert or update on inspections
  for each row execute function public.guard_inspection();

-- ============================================================
-- AGREEMENTS (tenant creates; nobody edits afterwards except service role/admin)
-- ============================================================
drop policy if exists "agreements tenant own" on agreements;
drop policy if exists "agreements landlord own houses" on agreements;
drop policy if exists "agreements admin all" on agreements;
drop policy if exists "agreements tenant read" on agreements;
drop policy if exists "agreements tenant insert" on agreements;
drop policy if exists "agreements landlord read" on agreements;

create policy "agreements tenant read" on agreements
  for select using (auth.uid() = tenant_id);
create policy "agreements tenant insert" on agreements
  for insert with check (
    auth.uid() = tenant_id
    and exists (
      select 1 from houses h
      where h.id = agreements.house_id and h.approval_status = 'approved' and h.is_available
    )
  );
create policy "agreements landlord read" on agreements
  for select using (
    exists (select 1 from houses h where h.id = agreements.house_id and h.landlord_id = auth.uid())
  );
create policy "agreements admin all" on agreements
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.guard_agreement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.pdf_path := null;  -- only the PDF edge function sets this
  end if;
  return new;
end;
$$;
drop trigger if exists guard_agreement on agreements;
create trigger guard_agreement
  before insert on agreements
  for each row execute function public.guard_agreement();

-- ============================================================
-- PAYMENTS: READ-ONLY for users. Writes happen ONLY in edge functions
-- (service role) after Paystack verification, or by an admin.
-- ============================================================
drop policy if exists "payments tenant own" on payments;
drop policy if exists "payments landlord own houses" on payments;
drop policy if exists "payments admin all" on payments;
drop policy if exists "payments tenant read" on payments;
drop policy if exists "payments landlord read" on payments;

create policy "payments tenant read" on payments
  for select using (
    exists (select 1 from agreements a where a.id = payments.agreement_id and a.tenant_id = auth.uid())
  );
create policy "payments landlord read" on payments
  for select using (
    exists (
      select 1 from agreements a
      join houses h on h.id = a.house_id
      where a.id = payments.agreement_id and h.landlord_id = auth.uid()
    )
  );
create policy "payments admin all" on payments
  for all using (public.is_admin()) with check (public.is_admin());
