\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
insert into auth.users (id,email,raw_user_meta_data) values
 ('bbbbbbbb-0000-0000-0000-000000000001','l1@x.ng','{"username":"landone","full_name":"Land One","phone":"1","role":"landlord"}'),
 ('bbbbbbbb-0000-0000-0000-000000000002','l2@x.ng','{"username":"landtwo","full_name":"Land Two","phone":"2","role":"landlord"}'),
 ('bbbbbbbb-0000-0000-0000-000000000003','t1@x.ng','{"username":"tenantone","full_name":"Ten One","phone":"3"}'),
 ('bbbbbbbb-0000-0000-0000-000000000004','a1@x.ng','{"username":"adminone","full_name":"Adm One","phone":"4"}');
update profiles set role='admin' where username='adminone';
select 'S0 buckets configured -> ' || count(*) from storage.buckets;

-- ---- storage ----
set role authenticated; set request.jwt.claim.sub='bbbbbbbb-0000-0000-0000-000000000001';
insert into storage.objects (bucket_id,name) values ('house-media','bbbbbbbb-0000-0000-0000-000000000001/h1/a.jpg');
select 'S1 landlord uploads to own folder (want 1) -> ' || count(*) from storage.objects;
insert into storage.objects (bucket_id,name) values ('house-media','bbbbbbbb-0000-0000-0000-000000000002/h1/evil.jpg');
select 'S2 landlord uploads to ANOTHER folder (want error above, still 1) -> ' || count(*) from storage.objects;
reset role; set request.jwt.claim.sub='';
insert into storage.objects (bucket_id,name) values ('landlord-docs','bbbbbbbb-0000-0000-0000-000000000002/id.pdf');
set role authenticated; set request.jwt.claim.sub='bbbbbbbb-0000-0000-0000-000000000001';
select 'S3 landlord reads OTHER landlord ID doc (want 0) -> ' || count(*) from storage.objects where bucket_id='landlord-docs';
reset role; set request.jwt.claim.sub='bbbbbbbb-0000-0000-0000-000000000003';
set role authenticated;
insert into storage.objects (bucket_id,name) values ('house-media','bbbbbbbb-0000-0000-0000-000000000003/x.jpg');
select 'S4 tenant upload blocked (want error above)';
reset role; set request.jwt.claim.sub='bbbbbbbb-0000-0000-0000-000000000004'; set role authenticated;
select 'S5 admin reads landlord ID docs (want 1) -> ' || count(*) from storage.objects where bucket_id='landlord-docs';
reset role; set request.jwt.claim.sub='';

-- ---- houses: unverified landlord cannot be approved ----
insert into houses (landlord_id,title,description,house_type,category_id,location_text,city,annual_rent_kobo)
 select 'bbbbbbbb-0000-0000-0000-000000000001','H1','d','self-contain',id,'Yaba','Lagos',90000000 from categories limit 1;
set role authenticated; set request.jwt.claim.sub='bbbbbbbb-0000-0000-0000-000000000004';
update houses set approval_status='approved' where title='H1';
select 'H1 admin approves house of UNVERIFIED landlord (want error above, pending) -> ' || approval_status from houses where title='H1';
update landlord_profiles set verified=true where user_id='bbbbbbbb-0000-0000-0000-000000000001';
update houses set approval_status='approved' where title='H1';
select 'H2 after verification admin approves -> ' || approval_status from houses where title='H1';
reset role; set request.jwt.claim.sub='';

-- ---- material edit resets approval; non-material does not ----
set role authenticated; set request.jwt.claim.sub='bbbbbbbb-0000-0000-0000-000000000001';
update houses set description='nicer text', vacant_space=2 where title='H1';
select 'H3 non-material edit keeps approved -> ' || approval_status from houses where title='H1';
update houses set annual_rent_kobo=50000000 where title='H1';
select 'H4 price edit sends back to pending -> ' || approval_status from houses where title='H1';
reset role; set request.jwt.claim.sub='';

-- ---- rejection + resubmit ----
update houses set approval_status='rejected', rejection_reason='Blurry photos' where title='H1';
set role authenticated; set request.jwt.claim.sub='bbbbbbbb-0000-0000-0000-000000000001';
update houses set approval_status='pending', rejection_reason=null where title='H1';
select 'R1 landlord cannot self-resubmit via UPDATE (want rejected) -> ' || approval_status || ' / ' || rejection_reason from houses where title='H1';
select public.resubmit_house(id) from houses where title='H1';
select 'R2 resubmit RPC (want pending, null reason) -> ' || approval_status || ' / ' || coalesce(rejection_reason,'NULL') from houses where title='H1';
select 'R3 guard flag reset after RPC -> ' || coalesce(current_setting('app.bypass_guard',true),'unset');
update houses set approval_status='approved' where title='H1';
select 'R4 still cannot self-approve afterwards (want pending) -> ' || approval_status from houses where title='H1';

-- ---- videos ----
insert into house_videos (house_id,area_label,duration_sec,size_bytes,url,sort_order) select id,'Kitchen',181,1000,'u',1 from houses where title='H1';
select 'V1 181s clip rejected (want error above)';
insert into house_videos (house_id,area_label,duration_sec,size_bytes,url,sort_order) select id,'Kitchen',60,157286401,'u',1 from houses where title='H1';
select 'V2 oversize clip rejected (want error above)';
insert into house_videos (house_id,area_label,duration_sec,size_bytes,url,sort_order) select id,'',60,1000,'u',1 from houses where title='H1';
select 'V3 missing label rejected (want error above)';
insert into house_videos (house_id,area_label,duration_sec,size_bytes,url,sort_order) select id,'Kitchen',60,1000,'u',1 from houses where title='H1';
insert into house_videos (house_id,area_label,duration_sec,size_bytes,url,sort_order) select id,'Living room',180,1000,'u',2 from houses where title='H1';
insert into house_videos (house_id,area_label,duration_sec,size_bytes,url,sort_order) select id,'Bathroom',45,1000,'u',3 from houses where title='H1';
insert into house_videos (house_id,area_label,duration_sec,size_bytes,url,sort_order) select id,'Exterior',45,1000,'u',4 from houses where title='H1';
select 'V4 exactly 3 stored, 180s allowed, 4th rejected (want 3) -> ' || count(*) from house_videos;
reset role; set request.jwt.claim.sub='';
-- public sees only approved videos on approved houses
update houses set approval_status='approved' where title='H1';
update house_videos set status='approved' where area_label='Kitchen';
set role anon;
select 'V5 anon sees only approved clips (want 1) -> ' || count(*) from house_videos;
reset role;

-- ---- delete rules ----
set role authenticated; set request.jwt.claim.sub='bbbbbbbb-0000-0000-0000-000000000001';
delete from houses where title='H1';
select 'D1 landlord cannot delete an APPROVED listing (want 1 left) -> ' || count(*) from houses where title='H1';
reset role; set request.jwt.claim.sub='';
set role authenticated; set request.jwt.claim.sub='bbbbbbbb-0000-0000-0000-000000000001';
delete from storage.objects where name='bbbbbbbb-0000-0000-0000-000000000001/h1/a.jpg';
select 'S6 landlord deletes own file (want 0 left of own) -> ' || count(*) from storage.objects where name like 'bbbbbbbb-0000-0000-0000-000000000001/%';
delete from storage.objects where name='bbbbbbbb-0000-0000-0000-000000000002/id.pdf';
reset role; set request.jwt.claim.sub='';
select 'S7 landlord could NOT delete other landlord file (want 1) -> ' || count(*) from storage.objects where name='bbbbbbbb-0000-0000-0000-000000000002/id.pdf';
-- landlord verification resubmit
update landlord_profiles set verified=false, rejection_reason='ID unreadable' where user_id='bbbbbbbb-0000-0000-0000-000000000001';
set role authenticated; set request.jwt.claim.sub='bbbbbbbb-0000-0000-0000-000000000001';
update landlord_profiles set rejection_reason=null, verified=true where user_id='bbbbbbbb-0000-0000-0000-000000000001';
select 'L1 landlord cannot clear rejection / self-verify via UPDATE (want f / ID unreadable) -> ' || verified || ' / ' || coalesce(rejection_reason,'NULL') from landlord_profiles where user_id='bbbbbbbb-0000-0000-0000-000000000001';
select public.resubmit_verification();
select 'L2 resubmit_verification (want f / NULL) -> ' || verified || ' / ' || coalesce(rejection_reason,'NULL') from landlord_profiles where user_id='bbbbbbbb-0000-0000-0000-000000000001';
select public.resubmit_verification();
select 'L3 second resubmit errors (want error above)';
reset role; set request.jwt.claim.sub='';
set role authenticated; set request.jwt.claim.sub='bbbbbbbb-0000-0000-0000-000000000001';
select public.resubmit_house(gen_random_uuid());
select 'L4 resubmit_house on nothing errors (want error above)';
reset role; set request.jwt.claim.sub='';
