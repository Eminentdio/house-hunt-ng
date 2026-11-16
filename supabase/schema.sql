-- HouseHunt NG - Phase 1 Foundation Schema
-- Run this in your Supabase SQL Editor

-- Enable extensions
create extension if not exists "pgcrypto";

-- ============================================
-- app_config: platform configuration (fee rate, limits, etc.)
-- ============================================
create table app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

insert into app_config (key, value) values
  ('fee_rate', '0.15'),
  ('max_videos', '3'),
  ('max_video_seconds', '180'),
  ('max_video_size_mb', '150');

-- ============================================
-- profiles: user accounts with roles
-- ============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text not null,
  email text not null,
  phone text not null,
  role text not null check (role in ('tenant', 'landlord', 'admin')) default 'tenant',
  created_at timestamptz default now()
);

-- Case-insensitive unique username index
create unique index profiles_username_lower_idx on profiles (lower(username));

-- ============================================
-- landlord_profiles: landlord verification and bank details
-- ============================================
create table landlord_profiles (
  user_id uuid references profiles(id) on delete cascade primary key,
  date_of_birth date,
  id_document_url text,
  bank_account_name text,
  bank_code text,
  account_number_last4 text,
  paystack_recipient_code text,
  verified boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- categories: house categories
-- ============================================
create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  cover_image_url text,
  created_at timestamptz default now()
);

-- ============================================
-- houses: property listings
-- ============================================
create table houses (
  id uuid default gen_random_uuid() primary key,
  landlord_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  house_type text not null,
  category_id uuid references categories(id) not null,
  location_text text not null,
  city text not null,
  lat double precision,
  lng double precision,
  vacant_space integer not null default 1,
  house_status text not null check (house_status in ('available', 'rented', 'under_renovation')) default 'available',
  annual_rent_kobo bigint not null check (annual_rent_kobo >= 0),
  tenancy_period_months integer not null default 12,
  is_available boolean not null default true,
  approval_status text not null check (approval_status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz default now()
);

-- ============================================
-- house_media: photos and 360° tours
-- ============================================
create table house_media (
  id uuid default gen_random_uuid() primary key,
  house_id uuid references houses(id) on delete cascade not null,
  kind text not null check (kind in ('photo', 'tour360')),
  room_label text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- ============================================
-- house_videos: up to 3 videos per house
-- ============================================
create table house_videos (
  id uuid default gen_random_uuid() primary key,
  house_id uuid references houses(id) on delete cascade not null,
  area_label text not null,
  duration_sec integer,
  size_bytes bigint,
  status text not null check (status in ('processing', 'pending_review', 'approved', 'rejected')) default 'processing',
  url text,
  thumbnail_url text,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- Trigger to enforce max 3 videos per house
create or replace function enforce_max_videos()
returns trigger as $$
declare
  video_count integer;
begin
  select count(*) into video_count
  from house_videos
  where house_id = new.house_id;

  if video_count >= 3 then
    raise exception 'Maximum of 3 videos allowed per house';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trigger_enforce_max_videos
before insert on house_videos
for each row
execute function enforce_max_videos();

-- ============================================
-- inspections: booking viewings
-- ============================================
create table inspections (
  id uuid default gen_random_uuid() primary key,
  house_id uuid references houses(id) on delete cascade not null,
  tenant_id uuid references profiles(id) on delete cascade not null,
  requested_at timestamptz default now(),
  scheduled_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- ============================================
-- agreements: tenancy agreements
-- ============================================
create table agreements (
  id uuid default gen_random_uuid() primary key,
  house_id uuid references houses(id) on delete cascade not null,
  tenant_id uuid references profiles(id) on delete cascade not null,
  terms_snapshot text not null,
  tenant_signed_name text,
  signed_at timestamptz,
  pdf_path text,
  created_at timestamptz default now()
);

-- ============================================
-- payments: escrow payments
-- ============================================
create table payments (
  id uuid default gen_random_uuid() primary key,
  agreement_id uuid references agreements(id) on delete cascade not null,
  rent_kobo bigint not null check (rent_kobo >= 0),
  fee_kobo bigint not null check (fee_kobo >= 0),
  total_kobo bigint not null check (total_kobo >= 0),
  fee_rate numeric(5,4) not null,
  paystack_reference text,
  status text not null check (status in ('pending', 'paid', 'held', 'released', 'refunded', 'failed')) default 'pending',
  paid_at timestamptz,
  escrow_released_at timestamptz,
  payout_reference text,
  receipt_pdf_path text,
  created_at timestamptz default now()
);

-- ============================================
-- renovation_updates: landlord progress updates
-- ============================================
create table renovation_updates (
  id uuid default gen_random_uuid() primary key,
  house_id uuid references houses(id) on delete cascade not null,
  area text not null check (area in ('house', 'room', 'apartment')),
  area_label text not null,
  percent_complete integer not null check (percent_complete >= 0 and percent_complete <= 100),
  note text,
  photo_url text,
  created_at timestamptz default now()
);

-- ============================================
-- notifications_log: email notification audit log
-- ============================================
create table notifications_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  subject text not null,
  sent_at timestamptz,
  status text not null,
  created_at timestamptz default now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table landlord_profiles enable row level security;
alter table categories enable row level security;
alter table houses enable row level security;
alter table house_media enable row level security;
alter table house_videos enable row level security;
alter table inspections enable row level security;
alter table agreements enable row level security;
alter table payments enable row level security;
alter table renovation_updates enable row level security;
alter table notifications_log enable row level security;
alter table app_config enable row level security;

-- ============================================
-- RLS Policies
-- ============================================

-- app_config: public read, admin write
create policy "app_config public read" on app_config
  for select using (true);

create policy "app_config admin write" on app_config
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- profiles: users can read all profiles, update their own
create policy "profiles public read" on profiles
  for select using (true);

create policy "profiles own write" on profiles
  for all using (auth.uid() = id);

-- landlord_profiles: public can read verified landlords, owners manage their own
create policy "landlord_profiles public read verified" on landlord_profiles
  for select using (verified = true);

create policy "landlord_profiles owner manage" on landlord_profiles
  for all using (auth.uid() = user_id);

-- categories: public read, admin write
create policy "categories public read" on categories
  for select using (true);

create policy "categories admin write" on categories
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- houses: public can read approved + available, landlords manage their own, admins all
create policy "houses public read approved available" on houses
  for select using (
    approval_status = 'approved' and is_available = true
  );

create policy "houses landlord manage own" on houses
  for all using (
    auth.uid() = landlord_id
  );

create policy "houses admin all" on houses
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- house_media: public read for approved houses, landlord/admin manage
create policy "house_media public read" on house_media
  for select using (
    exists (
      select 1 from houses
      where houses.id = house_media.house_id
        and houses.approval_status = 'approved'
        and houses.is_available = true
    )
  );

create policy "house_media landlord manage own" on house_media
  for all using (
    exists (
      select 1 from houses
      where houses.id = house_media.house_id
        and houses.landlord_id = auth.uid()
    )
  );

create policy "house_media admin all" on house_media
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- house_videos: public read for approved houses, landlord/admin manage
create policy "house_videos public read" on house_videos
  for select using (
    exists (
      select 1 from houses
      where houses.id = house_videos.house_id
        and houses.approval_status = 'approved'
        and houses.is_available = true
    )
  );

create policy "house_videos landlord manage own" on house_videos
  for all using (
    exists (
      select 1 from houses
      where houses.id = house_videos.house_id
        and houses.landlord_id = auth.uid()
    )
  );

create policy "house_videos admin all" on house_videos
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- inspections: tenants see their own, landlords see their houses', admins all
create policy "inspections tenant own" on inspections
  for all using (auth.uid() = tenant_id);

create policy "inspections landlord own houses" on inspections
  for all using (
    exists (
      select 1 from houses
      where houses.id = inspections.house_id
        and houses.landlord_id = auth.uid()
    )
  );

create policy "inspections admin all" on inspections
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- agreements: tenants see their own, landlords see their houses', admins all
create policy "agreements tenant own" on agreements
  for all using (auth.uid() = tenant_id);

create policy "agreements landlord own houses" on agreements
  for all using (
    exists (
      select 1 from houses
      where houses.id = agreements.house_id
        and houses.landlord_id = auth.uid()
    )
  );

create policy "agreements admin all" on agreements
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- payments: tenants see their own, landlords see their houses', admins all
create policy "payments tenant own" on payments
  for all using (
    exists (
      select 1 from agreements
      where agreements.id = payments.agreement_id
        and agreements.tenant_id = auth.uid()
    )
  );

create policy "payments landlord own houses" on payments
  for all using (
    exists (
      select 1 from agreements
      join houses on houses.id = agreements.house_id
      where agreements.id = payments.agreement_id
        and houses.landlord_id = auth.uid()
    )
  );

create policy "payments admin all" on payments
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- renovation_updates: public read for approved houses, landlord/admin manage
create policy "renovation_updates public read" on renovation_updates
  for select using (
    exists (
      select 1 from houses
      where houses.id = renovation_updates.house_id
        and houses.approval_status = 'approved'
    )
  );

create policy "renovation_updates landlord manage own" on renovation_updates
  for all using (
    exists (
      select 1 from houses
      where houses.id = renovation_updates.house_id
        and houses.landlord_id = auth.uid()
    )
  );

create policy "renovation_updates admin all" on renovation_updates
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- notifications_log: owners see their own, admins all
create policy "notifications_log owner read" on notifications_log
  for select using (auth.uid() = user_id);

create policy "notifications_log admin all" on notifications_log
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================
-- Helper: resolve username to email (for username login)
-- ============================================
create or replace function resolve_username_to_email(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from profiles where lower(username) = lower(p_username) limit 1;
$$;

-- ============================================
-- Seed data: categories
-- ============================================
insert into categories (name, slug, cover_image_url) values
  ('Self Contain', 'self-contain', null),
  ('1 Bedroom Flat', '1-bedroom-flat', null),
  ('2 Bedroom Flat', '2-bedroom-flat', null),
  ('3 Bedroom Flat', '3-bedroom-flat', null),
  ('Duplex', 'duplex', null),
  ('Shop', 'shop', null);