-- Seed script for HouseHunt NG Phase 1
-- Run this in your Supabase SQL Editor after creating the schema

-- ============================================
-- Seed data: profiles
-- ============================================

-- Admin user (username: admin, email: admin@househunt.ng)
INSERT INTO profiles (id, username, full_name, email, phone, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  'Admin User',
  'admin@househunt.ng',
  '+234-800-000-0001',
  'admin',
  now()
);

-- Landlord user (username: landlord, email: landlord@househunt.ng)
INSERT INTO profiles (id, username, full_name, email, phone, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'landlord',
  'Landlord User',
  'landlord@househunt.ng',
  '+234-800-000-0002',
  'landlord',
  now()
);

-- Tenant user (username: tenant, email: tenant@househunt.ng)
INSERT INTO profiles (id, username, full_name, email, phone, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'tenant',
  'Tenant User',
  'tenant@househunt.ng',
  '+234-800-000-0003',
  'tenant',
  now()
);

-- ============================================
-- Seed data: landlord_profiles
-- ============================================

INSERT INTO landlord_profiles (user_id, date_of_birth, id_document_url, bank_account_name, bank_code, account_number_last4, paystack_recipient_code, verified, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '1990-01-01',
  'https://example.com/id-docs/landlord-id.pdf',
  'Landlord User',
  '000001',
  '1234',
  'REC-001',
  true,
  now()
);

-- ============================================
-- Seed data: houses
-- ============================================

WITH landlord AS (
  SELECT id FROM profiles WHERE username = 'landlord' AND role = 'landlord'
),
category_self AS (
  SELECT id FROM categories WHERE slug = 'self-contain'
),
category_1bed AS (
  SELECT id FROM categories WHERE slug = '1-bedroom-flat'
),
category_2bed AS (
  SELECT id FROM categories WHERE slug = '2-bedroom-flat'
),
category_3bed AS (
  SELECT id FROM categories WHERE slug = '3-bedroom-flat'
),
category_duplex AS (
  SELECT id FROM categories WHERE slug = 'duplex'
),
category_shop AS (
  SELECT id FROM categories WHERE slug = 'shop'
)
INSERT INTO houses (id, landlord_id, title, description, house_type, category_id, location_text, city, lat, lng, vacant_space, house_status, annual_rent_kobo, tenancy_period_months, is_available, approval_status, created_at)
SELECT
  gen_random_uuid(),
  l.id,
  'Modern Self Contain Apartment',
  'A beautiful self-contain apartment in a quiet area with all modern amenities. Perfect for professionals seeking comfort and convenience.',
  'self-contain',
  c.id,
  '123 Victoria Island, Lagos',
  'Lagos',
  6.4465,
  3.4265,
  1,
  'available',
  900000,
  12,
  true,
  'approved',
  now()
FROM landlord l, category_self c
UNION ALL
SELECT
  gen_random_uuid(),
  l.id,
  'Spacious 2 Bedroom Flat',
  'Two-bedroom flat with spacious living areas and a private balcony. Located in a prime area with good security.',
  '2-bedroom-flat',
  c.id,
  '456 Lekki Phase 1, Lagos',
  'Lagos',
  6.4465,
  3.4265,
  2,
  'available',
  1200000,
  12,
  true,
  'approved',
  now()
FROM landlord l, category_1bed c
UNION ALL
SELECT
  gen_random_uuid(),
  l.id,
  'Luxury 3 Bedroom Flat',
  'Luxury three-bedroom flat with premium finishes and city views. Secure parking and 24/7 security available.',
  '3-bedroom-flat',
  c.id,
  '789 Ikoyi, Lagos',
  'Lagos',
  6.4650,
  3.4450,
  3,
  'available',
  2500000,
  12,
  true,
  'approved',
  now()
FROM landlord l, category_3bed c
UNION ALL
SELECT
  gen_random_uuid(),
  l.id,
  'Duplex with Garden',
  'Spacious duplex with private garden and parking for two cars. Ideal for families seeking space and privacy.',
  'duplex',
  c.id,
  '321 Gwarimpa, Abuja',
  'Abuja',
  9.0765,
  7.3986,
  4,
  'available',
  3500000,
  24,
  true,
  'approved',
  now()
FROM landlord l, category_duplex c
UNION ALL
SELECT
  gen_random_uuid(),
  l.id,
  'Ground Floor Shop Space',
  'Ground floor shop space in a busy market area with high foot traffic. Great for retail business.',
  'shop',
  c.id,
  '155 Aba Road, Aba',
  'Aba',
  5.1083,
  7.4758,
  1,
  'available',
  1800000,
  12,
  true,
  'approved',
  now()
FROM landlord l, category_shop c;

-- ============================================
-- Seed data: house_media
-- ============================================

WITH houses AS (
  SELECT id FROM houses WHERE title = 'Modern Self Contain Apartment'
)
INSERT INTO house_media (house_id, kind, room_label, url, sort_order, created_at)
SELECT
  h.id,
  'photo',
  'Living Room',
  'https://images.unsplash.com/photo-1560448184-6b0ce4e0a3c4?auto=format&fit=crop&w=800&q=80',
  0,
  now()
FROM houses h
UNION ALL
SELECT
  h.id,
  'photo',
  'Kitchen',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
  1,
  now()
FROM houses h
UNION ALL
SELECT
  h.id,
  'tour360',
  'Entire Apartment',
  'https://example.com/360/tour1.json',
  0,
  now()
FROM houses h;

-- ============================================
-- Seed data: house_videos
-- ============================================

WITH houses AS (
  SELECT id FROM houses WHERE title = 'Modern Self Contain Apartment'
)
INSERT INTO house_videos (house_id, area_label, duration_sec, size_bytes, status, url, thumbnail_url, sort_order, created_at)
SELECT
  h.id,
  'Living Room',
  45,
  15728640,
  'approved',
  'https://example.com/videos/living-room.mp4',
  'https://example.com/videos/living-room-thumb.jpg',
  0,
  now()
FROM houses h
UNION ALL
SELECT
  h.id,
  'Kitchen',
  30,
  10485760,
  'approved',
  'https://example.com/videos/kitchen.mp4',
  'https://example.com/videos/kitchen-thumb.jpg',
  1,
  now()
FROM houses h;

-- ============================================
-- Seed data: inspections
-- ============================================

WITH houses AS (
  SELECT id FROM houses WHERE title = 'Modern Self Contain Apartment'
),
tenants AS (
  SELECT id FROM profiles WHERE username = 'tenant' AND role = 'tenant'
)
INSERT INTO inspections (house_id, tenant_id, requested_at, scheduled_at, status, created_at)
SELECT
  h.id,
  t.id,
  now(),
  now() + interval '2 days',
  'pending',
  now()
FROM houses h, tenants t;

-- ============================================
-- Seed data: agreements
-- ============================================

WITH houses AS (
  SELECT id FROM houses WHERE title = 'Modern Self Contain Apartment'
),
tenants AS (
  SELECT id FROM profiles WHERE username = 'tenant' AND role = 'tenant'
)
INSERT INTO agreements (id, house_id, tenant_id, terms_snapshot, tenant_signed_name, signed_at, pdf_path, created_at)
SELECT
  gen_random_uuid(),
  h.id,
  t.id,
  'Standard tenancy agreement for 12 months with 15% platform fee',
  NULL,
  NULL,
  NULL,
  now()
FROM houses h, tenants t;

-- ============================================
-- Seed data: payments
-- ============================================

WITH agreements AS (
  SELECT id FROM agreements WHERE tenant_id = (SELECT id FROM profiles WHERE username = 'tenant' AND role = 'tenant')
)
INSERT INTO payments (id, agreement_id, rent_kobo, fee_kobo, total_kobo, fee_rate, paystack_reference, status, paid_at, escrow_released_at, payout_reference, receipt_pdf_path, created_at)
SELECT
  gen_random_uuid(),
  a.id,
  900000,
  135000,
  1035000,
  '0.15',
  'PAY-123456',
  'held',
  now(),
  NULL,
  'TRANS-123456',
  NULL,
  now()
FROM agreements a;

-- ============================================
-- Seed data: renovation_updates
-- ============================================

WITH houses AS (
  SELECT id FROM houses WHERE title = 'Modern Self Contain Apartment'
)
INSERT INTO renovation_updates (house_id, area, area_label, percent_complete, note, photo_url, created_at)
SELECT
  h.id,
  'house',
  'Entire Property',
  75,
  'Renovation almost complete. New paint and fixtures installed.',
  'https://example.com/renovation/photo1.jpg',
  now()
FROM houses h
UNION ALL
SELECT
  h.id,
  'room',
  'Living Room',
  90,
  'New furniture and lighting installed.',
  'https://example.com/renovation/photo2.jpg',
  now()
FROM houses h;

-- ============================================
-- Seed data: notifications_log
-- ============================================

WITH profiles AS (
  SELECT id, username FROM profiles
)
INSERT INTO notifications_log (user_id, type, subject, sent_at, status, created_at)
SELECT
  p.id,
  'email',
  'Welcome to HouseHunt NG',
  now(),
  'sent',
  now()
FROM profiles p
WHERE p.username IN ('tenant', 'landlord');