-- Ensure category routes have their canonical categories, including existing projects
-- that were initialized before the category seed was added.
insert into public.categories (name, slug, cover_image_url) values
  ('Self Contain', 'self-contain', null),
  ('1 Bedroom Flat', '1-bedroom-flat', null),
  ('2 Bedroom Flat', '2-bedroom-flat', null),
  ('3 Bedroom Flat', '3-bedroom-flat', null),
  ('Duplex', 'duplex', null),
  ('Shop', 'shop', null)
on conflict (slug) do nothing;
