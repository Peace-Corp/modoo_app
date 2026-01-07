alter table if exists public.reviews
  add column if not exists review_image_urls text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do nothing;

