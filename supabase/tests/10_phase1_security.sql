\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
-- create users like Supabase Auth would (trigger builds profiles)
insert into auth.users (id,email,raw_user_meta_data) values
 ('aaaaaaaa-0000-0000-0000-000000000001','tenant@x.ng','{"username":"tola","full_name":"Tola Ade","phone":"0801","role":"admin"}'),
 ('aaaaaaaa-0000-0000-0000-000000000002','land@x.ng','{"username":"landy","full_name":"Landy Bello","phone":"0802","role":"landlord"}'),
 ('aaaaaaaa-0000-0000-0000-000000000003','boss@x.ng','{"username":"boss","full_name":"Boss Man","phone":"0803"}');
update profiles set role='admin' where username='boss';   -- superuser/SQL editor promotes admin
select 'T1 signup with role=admin in metadata -> ' || role from profiles where username='tola';
select 'T1b landlord_profiles row auto-created -> ' || count(*) from landlord_profiles;

\i supabase/seed.sql
select 'T2 seed ok, houses=' || count(*) from houses;

-- ---- anon ----
set role anon;
select 'T3 anon cannot directly read profiles (want f) -> ' || has_table_privilege('anon', 'public.profiles', 'select');
select 'T3b anon cannot directly read landlord_profiles (want f) -> ' || has_table_privilege('anon', 'public.landlord_profiles', 'select');
select 'T3c anon sees approved+available houses (want 4) -> ' || count(*) from houses;
select 'T3d anon public_landlords -> ' || first_name || ' verified=' || verified from public_landlords;
select 'T3e anon sees seeded categories (want 6) -> ' || count(*) from categories;
select 'T3f username_available(landy) (want f) -> ' || username_available('landy');
reset role;

-- ---- tenant attacks ----
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
update profiles set role='admin' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select 'T4 tenant self-promote to admin (want tenant) -> ' || role from profiles where id='aaaaaaaa-0000-0000-0000-000000000001';
select 'T4b tenant can read other profiles (want 0 others) -> ' || count(*) from profiles where id <> 'aaaaaaaa-0000-0000-0000-000000000001';
insert into payments (agreement_id,rent_kobo,fee_kobo,total_kobo,fee_rate,status) values (gen_random_uuid(),1,1,1,0.15,'paid');
select 'T5 tenant payments visible (want 0) -> ' || count(*) from payments;
reset role;

-- ---- landlord attacks ----
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
insert into houses (landlord_id,title,description,house_type,category_id,location_text,city,annual_rent_kobo,approval_status,is_available)
  values ('aaaaaaaa-0000-0000-0000-000000000002','Sneaky house','d','self-contain',(select id from categories limit 1),'x','Lagos',100,'approved',true);
select 'T6 landlord inserts as approved (want pending) -> ' || approval_status from houses where title='Sneaky house';
update houses set approval_status='approved' where title='Sneaky house';
select 'T6b landlord self-approves (want pending) -> ' || approval_status from houses where title='Sneaky house';
update landlord_profiles set verified=false, bank_account_name='Me' where user_id='aaaaaaaa-0000-0000-0000-000000000002';
update landlord_profiles set verified=true where user_id='aaaaaaaa-0000-0000-0000-000000000002';
reset role; set request.jwt.claim.sub = '';
update landlord_profiles set verified=false where user_id='aaaaaaaa-0000-0000-0000-000000000002';
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
update landlord_profiles set verified=true where user_id='aaaaaaaa-0000-0000-0000-000000000002';
select 'T7 landlord self-verify (want f) -> ' || verified from landlord_profiles where user_id='aaaaaaaa-0000-0000-0000-000000000002';
-- videos
insert into house_videos (house_id,area_label,duration_sec,size_bytes,status,url,sort_order)
  select id,'Kitchen',120,1000,'approved','u',1 from houses where title='Sneaky house';
select 'T8 video status forced (want pending_review) -> ' || status from house_videos;
insert into house_videos (house_id,area_label,duration_sec,size_bytes,url,sort_order) select id,'A',10,1,'u',2 from houses where title='Sneaky house';
insert into house_videos (house_id,area_label,duration_sec,size_bytes,url,sort_order) select id,'B',10,1,'u',3 from houses where title='Sneaky house';
insert into house_videos (house_id,area_label,duration_sec,size_bytes,url,sort_order) select id,'C',10,1,'u',4 from houses where title='Sneaky house';
select 'T9 videos stored after 4 attempts (want 3) -> ' || count(*) from house_videos;
reset role;

-- ---- admin ----
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000003';
update houses set approval_status='approved' where title='Sneaky house';
select 'T10 admin approves house -> ' || approval_status from houses where title='Sneaky house';
select 'T10b admin reads all profiles (want 3) -> ' || count(*) from profiles;
update profiles set role='landlord' where username='tola';
select 'T10c admin can change role -> ' || role from profiles where username='tola';
reset role;
