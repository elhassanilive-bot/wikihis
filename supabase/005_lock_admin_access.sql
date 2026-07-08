-- Wikihat strict admin access hardening.
-- Run this after the blog schema/storage/member migrations.
-- It removes temporary public write policies and restricts admin-grade access
-- to these emails only:
--   studioelhassani@gmail.com
--   elhassanilive@gmail.com

create table if not exists public.site_admins (
  email text primary key,
  display_name text,
  created_at timestamptz not null default now()
);

insert into public.site_admins (email, display_name)
values
  ('studioelhassani@gmail.com', 'Wikihat Admin'),
  ('elhassanilive@gmail.com', 'Wikihat Admin')
on conflict (email) do update
set display_name = excluded.display_name;

alter table public.site_admins enable row level security;

drop policy if exists site_admins_no_public_read on public.site_admins;
create policy site_admins_no_public_read
on public.site_admins
for select
to authenticated
using (false);

create or replace function public.is_wikihat_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_admins admins
    where lower(admins.email) = lower(coalesce(auth.jwt()->>'email', ''))
      and lower(admins.email) in ('studioelhassani@gmail.com', 'elhassanilive@gmail.com')
  );
$$;

revoke all on function public.is_wikihat_admin() from public;
grant execute on function public.is_wikihat_admin() to authenticated;

alter table public.blog_posts enable row level security;
alter table public.blog_post_assets enable row level security;
alter table public.blog_post_links enable row level security;

-- Remove temporary development policies that allowed anon/authenticated writes.
drop policy if exists blog_posts_insert_temp on public.blog_posts;
drop policy if exists blog_posts_update_temp on public.blog_posts;
drop policy if exists blog_posts_delete_temp on public.blog_posts;
drop policy if exists blog_assets_insert_temp on public.blog_post_assets;
drop policy if exists blog_links_insert_temp on public.blog_post_links;

-- Admin review policies should depend on the hardened helper, not open checks.
drop policy if exists blog_posts_admin_review_read on public.blog_posts;
create policy blog_posts_admin_review_read
on public.blog_posts
for select
to authenticated
using (public.is_wikihat_admin());

drop policy if exists blog_posts_admin_review_update on public.blog_posts;
create policy blog_posts_admin_review_update
on public.blog_posts
for update
to authenticated
using (public.is_wikihat_admin())
with check (public.is_wikihat_admin());

drop policy if exists blog_posts_admin_insert on public.blog_posts;
create policy blog_posts_admin_insert
on public.blog_posts
for insert
to authenticated
with check (public.is_wikihat_admin());

drop policy if exists blog_posts_admin_delete on public.blog_posts;
create policy blog_posts_admin_delete
on public.blog_posts
for delete
to authenticated
using (public.is_wikihat_admin());

drop policy if exists blog_assets_admin_all on public.blog_post_assets;
create policy blog_assets_admin_all
on public.blog_post_assets
for all
to authenticated
using (public.is_wikihat_admin())
with check (public.is_wikihat_admin());

drop policy if exists blog_links_admin_all on public.blog_post_links;
create policy blog_links_admin_all
on public.blog_post_links
for all
to authenticated
using (public.is_wikihat_admin())
with check (public.is_wikihat_admin());

-- Keep media publicly readable, but restrict write operations to the two admins.
drop policy if exists "blog media public upload" on storage.objects;
drop policy if exists "blog media public update" on storage.objects;
drop policy if exists "blog media public delete" on storage.objects;
drop policy if exists "blog media admin upload" on storage.objects;
drop policy if exists "blog media admin update" on storage.objects;
drop policy if exists "blog media admin delete" on storage.objects;

create policy "blog media admin upload"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'blog-media' and public.is_wikihat_admin());

create policy "blog media admin update"
on storage.objects
for update
to authenticated
using (bucket_id = 'blog-media' and public.is_wikihat_admin())
with check (bucket_id = 'blog-media' and public.is_wikihat_admin());

create policy "blog media admin delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'blog-media' and public.is_wikihat_admin());
