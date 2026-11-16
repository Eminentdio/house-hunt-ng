-- ============================================================
-- HouseHunt NG - sample listings (optional, for development)
--
-- BEFORE running this:
--   1. Run schema.sql, then 002_security_hardening.sql
--   2. Sign up in the app as a LANDLORD (or add a user in
--      Supabase -> Authentication -> Users, then set role below)
--
-- To make yourself admin (SQL editor only):
--   update profiles set role = 'admin' where username = 'YOUR_USERNAME';
--
-- This script attaches 5 approved sample houses to the first landlord found.
-- It creates NO users, NO agreements and NO payments.
-- ============================================================
do $$
declare
  v_landlord uuid;
  v_reno_house uuid;
begin
  select id into v_landlord from profiles where role = 'landlord' order by created_at limit 1;
  if v_landlord is null then
    raise exception 'No landlord account yet. Sign up as a Landlord in the app first, then re-run this seed.';
  end if;

  insert into landlord_profiles (user_id, verified) values (v_landlord, true)
  on conflict (user_id) do update set verified = true;

  insert into houses (
    landlord_id, title, description, house_type, category_id, location_text, city,
    lat, lng, vacant_space, house_status, annual_rent_kobo, tenancy_period_months,
    is_available, approval_status
  )
  select
    v_landlord, h.title, h.description, h.house_type, c.id, h.location_text, h.city,
    h.lat, h.lng, h.vacant_space, h.house_status, h.rent_naira * 100, 12,
    h.is_available, 'approved'
  from (values
    ('self-contain',     'Modern Self Contain',   'Clean self-contained room with tiled floor, prepaid meter and good water supply.',          'self-contain',   '12 Yaba Road, Yaba',          'Lagos', 6.5150, 3.3790, 1, 'available',        900000,  true),
    ('1-bedroom-flat',   'Cozy 1 Bedroom Flat',   'One-bedroom flat with a separate living room, fitted kitchen and secure compound.',         '1-bedroom-flat', '45 Surulere Street',          'Lagos', 6.4969, 3.3556, 1, 'available',        1500000, true),
    ('2-bedroom-flat',   'Spacious 2 Bedroom Flat','Two bedrooms, spacious living room and private balcony in a quiet, secure estate.',        '2-bedroom-flat', '456 Lekki Phase 1',           'Lagos', 6.4474, 3.4745, 2, 'available',        2800000, true),
    ('3-bedroom-flat',   'Luxury 3 Bedroom Flat', 'Premium finishes, ample parking and 24/7 security. Walking distance to shops.',            '3-bedroom-flat', '789 Ikoyi Road',              'Lagos', 6.4550, 3.4350, 3, 'available',        6500000, true),
    ('duplex',           'Family Duplex',         'Four-bedroom duplex with boys quarters, currently being renovated and repainted.',          'duplex',         '3 Maitama District',          'Abuja', 9.0830, 7.4930, 4, 'under_renovation', 9000000, false)
  ) as h(slug, title, description, house_type, location_text, city, lat, lng, vacant_space, house_status, rent_naira, is_available)
  join categories c on c.slug = h.slug;

  -- placeholder photos (replace with real uploads in Phase 2)
  insert into house_media (house_id, kind, room_label, url, sort_order)
  select id, 'photo', 'Exterior', 'https://picsum.photos/seed/' || id || '/800/600', 0 from houses where landlord_id = v_landlord;

  select id into v_reno_house from houses where landlord_id = v_landlord and house_status = 'under_renovation' limit 1;
  if v_reno_house is not null then
    insert into renovation_updates (house_id, area, area_label, percent_complete, note) values
      (v_reno_house, 'house', 'Whole house repaint', 60, 'Exterior and living areas painted.'),
      (v_reno_house, 'room',  'Master bedroom',       35, 'Wardrobe fitting in progress.');
  end if;
end $$;
