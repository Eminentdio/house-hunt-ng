-- Table privileges are required in addition to RLS policies.
-- These grants expose only the operations allowed by the policies below.
grant usage on schema public to anon, authenticated;

grant select on table
  public.app_config,
  public.categories,
  public.houses,
  public.house_media,
  public.house_videos,
  public.renovation_updates
to anon, authenticated;

grant select, update on table
  public.profiles,
  public.landlord_profiles
to authenticated;

grant insert, update, delete on table
  public.categories,
  public.houses,
  public.house_media,
  public.house_videos,
  public.renovation_updates
to authenticated;

grant select, insert, update on table public.inspections to authenticated;
grant select, insert on table public.agreements to authenticated;
grant select on table public.payments, public.notifications_log to authenticated;
