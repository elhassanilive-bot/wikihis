-- Wikihat unified SQL stack
-- Generated automatically to run all blog SQL files in safe order
-- NOTE: blog_temp_publishing.sql is DEV ONLY and permissive
-- Date: 2026-04-06


-- =====================================================
-- BEGIN: blog_schema.sql
-- =====================================================

-- Dridoud Blog Schema (Supabase / Postgres)
-- Ù‡Ø¯Ù: Ù†Ø¸Ø§Ù… ÙˆØ§Ø­Ø¯ Ø´Ø§Ù…Ù„ Ù„Ù„Ù…Ù‚Ø§Ù„Ø§Øª + ÙˆØ³Ø§Ø¦Ø· (ØµÙˆØ±/ÙÙŠØ¯ÙŠÙˆ/ØµÙˆØª/Ù…Ø³ØªÙ†Ø¯Ø§Øª/Ø±ÙˆØ§Ø¨Ø·) Ù…Ø¹ RLS.
--
-- Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…:
-- 1) Ø§ÙØªØ­ Supabase SQL Editor ÙˆØ§Ù„ØµÙ‚ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù ÙˆØ´ØºÙ‘Ù„Ù‡.
-- 2) Ø¥Ø°Ø§ ØªØ±ÙŠØ¯ Ø§Ù„Ù†Ø´Ø± "Ø¹Ø§Ù… Ù…Ø¤Ù‚ØªÙ‹Ø§" Ø¨Ø¯ÙˆÙ† ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„ØŒ ÙØ¹Ù‘Ù„ Ø³ÙŠØ§Ø³Ø© insert Ø§Ù„Ù…Ø¤Ù‚ØªØ© Ø¨Ø§Ù„Ø£Ø³ÙÙ„.

-- Extensions
create extension if not exists pgcrypto;

-- Enums (Ø§Ø®ØªÙŠØ§Ø±ÙŠ Ù„ÙƒÙ† Ø£Ù†ÙŠÙ‚)
do $$ begin
  create type public.blog_post_status as enum ('draft','published','archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.blog_asset_type as enum ('image','video','audio','document','embed','link');
exception when duplicate_object then null;
end $$;

-- Main posts table
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null,
  -- content: store Markdown (editor uses Markdown)
  content text not null,
  -- optional structured content blocks for future
  content_blocks jsonb,
  cover_image_url text,
  category text,
  tags text[] not null default '{}'::text[],
  status public.blog_post_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_published_at_idx
  on public.blog_posts (status, published_at desc);

create index if not exists blog_posts_created_at_idx
  on public.blog_posts (created_at desc);

create index if not exists blog_posts_tags_gin_idx
  on public.blog_posts using gin (tags);

-- Assets table (multiple assets per post)
create table if not exists public.blog_post_assets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  type public.blog_asset_type not null,
  title text,
  url text not null,
  -- extra metadata: {mime,size,width,height,duration,provider,thumbnailUrl,...}
  meta jsonb not null default '{}'::jsonb,
  -- ordering within the post
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists blog_post_assets_post_id_pos_idx
  on public.blog_post_assets (post_id, position);

-- Optional: links table (if you want curated sources/refs separate from assets)
create table if not exists public.blog_post_links (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  label text,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists blog_post_links_post_id_pos_idx
  on public.blog_post_links (post_id, position);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
before update on public.blog_posts
for each row execute function public.set_updated_at();

-- RLS
alter table public.blog_posts enable row level security;
alter table public.blog_post_assets enable row level security;
alter table public.blog_post_links enable row level security;

-- Public read: published posts only
drop policy if exists blog_posts_read_published on public.blog_posts;
create policy blog_posts_read_published
on public.blog_posts
for select
to anon, authenticated
using (status = 'published');

drop policy if exists blog_assets_read_published on public.blog_post_assets;
create policy blog_assets_read_published
on public.blog_post_assets
for select
to anon, authenticated
using (
  exists (
    select 1 from public.blog_posts p
    where p.id = blog_post_assets.post_id and p.status = 'published'
  )
);

drop policy if exists blog_links_read_published on public.blog_post_links;
create policy blog_links_read_published
on public.blog_post_links
for select
to anon, authenticated
using (
  exists (
    select 1 from public.blog_posts p
    where p.id = blog_post_links.post_id and p.status = 'published'
  )
);

-- Write policies (Recommended: use service_role only via server)
-- In Supabase, service_role bypasses RLS anyway if you use Service Role key server-side.
-- Keep RLS strict by default:
drop policy if exists blog_posts_write_authenticated on public.blog_posts;
drop policy if exists blog_assets_write_authenticated on public.blog_post_assets;
drop policy if exists blog_links_write_authenticated on public.blog_post_links;

-- TEMP OPTION (ØºÙŠØ± Ø¢Ù…Ù†): Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨Ø§Ù„Ù†Ø´Ø± Ø¨Ø¯ÙˆÙ† ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„ (Ù„Ù„ØªØ¬Ø§Ø±Ø¨ ÙÙ‚Ø·)
-- ÙØ¹Ù‘Ù„Ù‡ Ø¥Ø°Ø§ Ø£Ø±Ø¯Øª Ø£Ù† ÙŠØ¹Ù…Ù„ /admin/blog Ø§Ù„Ø¢Ù† Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… anon key:
-- create policy blog_posts_insert_temp
-- on public.blog_posts
-- for insert
-- to anon, authenticated
-- with check (true);
--
-- create policy blog_posts_update_temp
-- on public.blog_posts
-- for update
-- to anon, authenticated
-- using (true)
-- with check (true);
--
-- create policy blog_assets_insert_temp
-- on public.blog_post_assets
-- for insert
-- to anon, authenticated
-- with check (true);
--
-- create policy blog_links_insert_temp
-- on public.blog_post_links
-- for insert
-- to anon, authenticated
-- with check (true);


-- END: blog_schema.sql


-- =====================================================
-- BEGIN: blog_categories_hierarchy.sql
-- =====================================================

-- Blog categories hierarchy
-- Ø´ØºÙ‘Ù„ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù Ø¨Ø¹Ø¯ blog_schema.sql Ù„Ø¥Ø¶Ø§ÙØ© ØªØµÙ†ÙŠÙØ§Øª Ø±Ø¦ÙŠØ³ÙŠØ©/ÙØ±Ø¹ÙŠØ© Ø­Ù‚ÙŠÙ‚ÙŠØ© Ù„Ù„Ù…Ù‚Ø§Ù„Ø§Øª.

alter table public.blog_posts
  add column if not exists category_parent text;

alter table public.blog_posts
  add column if not exists category_slug text;

create index if not exists blog_posts_category_parent_idx
  on public.blog_posts (category_parent);

create index if not exists blog_posts_category_slug_idx
  on public.blog_posts (category_slug);

create table if not exists public.blog_categories (
  slug text primary key,
  name text not null,
  parent_slug text references public.blog_categories(slug) on delete cascade,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists blog_categories_parent_slug_idx
  on public.blog_categories (parent_slug, sort_order, name);

insert into public.blog_categories (slug, name, parent_slug, sort_order, is_active)
values
  ('technology', 'Ø§Ù„ØªÙƒÙ†ÙˆÙ„ÙˆØ¬ÙŠØ§', null, 10, true),
  ('ai', 'Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ', 'technology', 11, true),
  ('computers-electronics', 'Ø£Ø¬Ù‡Ø²Ø© Ø§Ù„ÙƒÙ…Ø¨ÙŠÙˆØªØ± ÙˆØ§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ§Øª', 'technology', 12, true),

  ('history', 'Ø§Ù„ØªØ§Ø±ÙŠØ®', null, 20, true),

  ('investment', 'Ø§Ù„Ø§Ø³ØªØ«Ù…Ø§Ø±', null, 30, true),
  ('economy', 'Ø§Ù‚ØªØµØ§Ø¯', 'investment', 31, true),
  ('business-finance', 'Ø§Ù„Ù…Ø§Ù„ ÙˆØ§Ù„Ø£Ø¹Ù…Ø§Ù„', 'investment', 32, true),

  ('sports', 'Ø§Ù„Ø±ÙŠØ§Ø¶Ø©', null, 40, true),
  ('fitness', 'Ø§Ù„Ø±ÙŠØ§Ø¶Ø© Ø§Ù„Ø¨Ø¯Ù†ÙŠØ©', 'sports', 41, true),
  ('yoga', 'Ø§Ù„ÙŠÙˆØ¬Ø§', 'sports', 42, true),

  ('travel', 'Ø§Ù„Ø³ÙØ±', null, 50, true),

  ('politics', 'Ø§Ù„Ø³ÙŠØ§Ø³Ø©', null, 60, true),
  ('middle-east', 'Ø´Ø±Ù‚ Ø£ÙˆØ³Ø·', 'politics', 61, true),
  ('world', 'Ø¹Ø§Ù„Ù…', 'politics', 62, true),

  ('arts', 'Ø§Ù„ÙÙ†ÙˆÙ†', null, 70, true),
  ('culture', 'Ø«Ù‚Ø§ÙØ©', 'arts', 71, true),
  ('variety', 'Ù…Ù†ÙˆØ¹Ø§Øª', 'arts', 72, true),

  ('animals', 'Ø§Ù„Ø­ÙŠÙˆØ§Ù†Ø§Øª', null, 80, true),
  ('environment', 'Ø§Ù„Ø¨ÙŠØ¦Ø©', null, 90, true),

  ('self-development', 'ØªØ·ÙˆÙŠØ± Ø§Ù„Ø°Ø§Øª', null, 100, true),
  ('mental-health', 'Ø§Ù„ØµØ­Ø© Ø§Ù„Ù†ÙØ³ÙŠØ©', 'self-development', 101, true),
  ('education-communication', 'Ø§Ù„ØªØ¹Ù„ÙŠÙ… ÙˆØ§Ù„ØªÙˆØ§ØµÙ„', 'self-development', 102, true),

  ('health', 'Ø§Ù„ØµØ­Ø©', null, 110, true),
  ('maternal-health', 'ØµØ­Ø© Ø§Ù„Ø£Ù…', 'health', 111, true),
  ('sleep-rest', 'Ø§Ù„Ù†ÙˆÙ… ÙˆØ§Ù„Ø±Ø§Ø­Ø©', 'health', 112, true),
  ('nutrition-meals', 'Ø§Ù„ÙˆØ¬Ø¨Ø§Øª ÙˆØ§Ù„ØªØºØ°ÙŠØ©', 'health', 113, true),

  ('women', 'Ø§Ù„Ù…Ø±Ø£Ø©', null, 120, true),
  ('womens-rights', 'Ø­Ù‚ÙˆÙ‚ Ø§Ù„Ù…Ø±Ø£Ø©', 'women', 121, true),
  ('womens-interests', 'Ø§Ù‡ØªÙ…Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø±Ø£Ø©', 'women', 122, true),
  ('womens-needs', 'Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø±Ø£Ø©', 'women', 123, true),

  ('cooking', 'Ø§Ù„Ø·Ø¨Ø®', null, 130, true)
on conflict (slug) do update
set
  name = excluded.name,
  parent_slug = excluded.parent_slug,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

update public.blog_posts
set category_parent = category
where category is not null
  and category_parent is null;

-- END: blog_categories_hierarchy.sql


-- =====================================================
-- BEGIN: blog_auth_comments.sql
-- =====================================================

-- Auth, profiles, avatars, and article comments
-- Ø´ØºÙ‘Ù„ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù Ø¨Ø¹Ø¯ blog_schema.sql Ùˆ blog_categories_hierarchy.sql

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  parent_comment_id uuid references public.blog_comments (id) on delete cascade,
  content text not null,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_comments_content_check check (char_length(trim(content)) >= 2)
);

alter table public.blog_comments
  add column if not exists parent_comment_id uuid references public.blog_comments (id) on delete cascade;

create table if not exists public.blog_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.blog_comments (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create index if not exists user_profiles_display_name_idx
  on public.user_profiles (display_name);

create index if not exists blog_comments_post_id_idx
  on public.blog_comments (post_id, created_at desc);

create index if not exists blog_comments_user_id_idx
  on public.blog_comments (user_id, created_at desc);

create index if not exists blog_comments_parent_comment_id_idx
  on public.blog_comments (parent_comment_id, created_at desc);

create index if not exists blog_comment_reactions_comment_id_idx
  on public.blog_comment_reactions (comment_id, reaction_type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists blog_comments_set_updated_at on public.blog_comments;
create trigger blog_comments_set_updated_at
before update on public.blog_comments
for each row execute function public.set_updated_at();

drop trigger if exists blog_comment_reactions_set_updated_at on public.blog_comment_reactions;
create trigger blog_comment_reactions_set_updated_at
before update on public.blog_comment_reactions
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.blog_comments enable row level security;
alter table public.blog_comment_reactions enable row level security;

drop policy if exists user_profiles_select_public on public.user_profiles;
create policy user_profiles_select_public
on public.user_profiles
for select
to anon, authenticated
using (true);

drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists blog_comments_select_public on public.blog_comments;
create policy blog_comments_select_public
on public.blog_comments
for select
to anon, authenticated
using (status = 'published');

drop policy if exists blog_comments_insert_own on public.blog_comments;
create policy blog_comments_insert_own
on public.blog_comments
for insert
to authenticated
with check (auth.uid() = user_id and status = 'published');

drop policy if exists blog_comments_update_own on public.blog_comments;
create policy blog_comments_update_own
on public.blog_comments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists blog_comments_delete_own on public.blog_comments;
create policy blog_comments_delete_own
on public.blog_comments
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists blog_comment_reactions_select_public on public.blog_comment_reactions;
create policy blog_comment_reactions_select_public
on public.blog_comment_reactions
for select
to anon, authenticated
using (true);

drop policy if exists blog_comment_reactions_insert_own on public.blog_comment_reactions;
create policy blog_comment_reactions_insert_own
on public.blog_comment_reactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists blog_comment_reactions_update_own on public.blog_comment_reactions;
create policy blog_comment_reactions_update_own
on public.blog_comment_reactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists blog_comment_reactions_delete_own on public.blog_comment_reactions;
create policy blog_comment_reactions_delete_own
on public.blog_comment_reactions
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set public = true;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');

drop policy if exists avatars_authenticated_upload on storage.objects;
create policy avatars_authenticated_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists avatars_authenticated_update on storage.objects;
create policy avatars_authenticated_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists avatars_authenticated_delete on storage.objects;
create policy avatars_authenticated_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- END: blog_auth_comments.sql


-- =====================================================
-- BEGIN: blog_engagement_bookmarks.sql
-- =====================================================

-- Post engagement (views + likes) and reading list (bookmarks)
-- Ø´ØºÙ‘Ù„ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù Ø¨Ø¹Ø¯ blog_schema.sql Ùˆ blog_auth_comments.sql

-- 1) Views counter (simple aggregate column)
alter table public.blog_posts
  add column if not exists view_count bigint not null default 0;

create index if not exists blog_posts_view_count_idx
  on public.blog_posts (view_count desc);

-- SECURITY DEFINER: allow incrementing views from anon/authenticated without opening update policies.
create or replace function public.increment_post_view(post_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only for published posts
  update public.blog_posts
  set view_count = view_count + 1
  where slug = post_slug
    and status::text = 'published';
end;
$$;

grant execute on function public.increment_post_view(text) to anon, authenticated;

-- 2) Post reactions (likes)
create table if not exists public.blog_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists blog_post_reactions_post_id_idx
  on public.blog_post_reactions (post_id, reaction_type, created_at desc);

create index if not exists blog_post_reactions_user_id_idx
  on public.blog_post_reactions (user_id, created_at desc);

drop trigger if exists blog_post_reactions_set_updated_at on public.blog_post_reactions;
create trigger blog_post_reactions_set_updated_at
before update on public.blog_post_reactions
for each row execute function public.set_updated_at();

alter table public.blog_post_reactions enable row level security;

drop policy if exists blog_post_reactions_select_public on public.blog_post_reactions;
create policy blog_post_reactions_select_public
on public.blog_post_reactions
for select
to anon, authenticated
using (true);

drop policy if exists blog_post_reactions_insert_own on public.blog_post_reactions;
create policy blog_post_reactions_insert_own
on public.blog_post_reactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists blog_post_reactions_delete_own on public.blog_post_reactions;
create policy blog_post_reactions_delete_own
on public.blog_post_reactions
for delete
to authenticated
using (auth.uid() = user_id);

-- 3) Reading list (bookmarks) with optional folders
create table if not exists public.blog_post_bookmarks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  folder text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists blog_post_bookmarks_user_id_idx
  on public.blog_post_bookmarks (user_id, created_at desc);

create index if not exists blog_post_bookmarks_user_folder_idx
  on public.blog_post_bookmarks (user_id, folder, created_at desc);

drop trigger if exists blog_post_bookmarks_set_updated_at on public.blog_post_bookmarks;
create trigger blog_post_bookmarks_set_updated_at
before update on public.blog_post_bookmarks
for each row execute function public.set_updated_at();

alter table public.blog_post_bookmarks enable row level security;

drop policy if exists blog_post_bookmarks_select_own on public.blog_post_bookmarks;
create policy blog_post_bookmarks_select_own
on public.blog_post_bookmarks
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists blog_post_bookmarks_insert_own on public.blog_post_bookmarks;
create policy blog_post_bookmarks_insert_own
on public.blog_post_bookmarks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists blog_post_bookmarks_update_own on public.blog_post_bookmarks;
create policy blog_post_bookmarks_update_own
on public.blog_post_bookmarks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists blog_post_bookmarks_delete_own on public.blog_post_bookmarks;
create policy blog_post_bookmarks_delete_own
on public.blog_post_bookmarks
for delete
to authenticated
using (auth.uid() = user_id);

-- 4) Dashboard stats (for account page)
create or replace function public.get_my_dashboard_stats()
returns table (
  published_count bigint,
  pending_count bigint,
  rejected_count bigint,
  total_views bigint,
  total_likes bigint,
  total_comments_received bigint,
  my_comments_count bigint,
  my_bookmarks_count bigint
)
language sql
security definer
set search_path = public
as $$
  with my_posts as (
    select id, status::text as status_text, coalesce(view_count, 0) as view_count
    from public.blog_posts
    where author_user_id = auth.uid()
  ),
  my_post_counts as (
    select
      sum(case when status_text = 'published' then 1 else 0 end) as published_count,
      sum(case when status_text = 'pending' then 1 else 0 end) as pending_count,
      sum(case when status_text = 'rejected' then 1 else 0 end) as rejected_count,
      sum(view_count) as total_views
    from my_posts
  ),
  likes as (
    select count(*)::bigint as total_likes
    from public.blog_post_reactions r
    join my_posts p on p.id = r.post_id
    where r.reaction_type = 'like'
  ),
  comments_received as (
    select count(*)::bigint as total_comments_received
    from public.blog_comments c
    join my_posts p on p.id = c.post_id
    where c.status = 'published'
  ),
  my_comments as (
    select count(*)::bigint as my_comments_count
    from public.blog_comments
    where user_id = auth.uid()
      and status = 'published'
  ),
  my_bookmarks as (
    select count(*)::bigint as my_bookmarks_count
    from public.blog_post_bookmarks
    where user_id = auth.uid()
  )
  select
    coalesce(pc.published_count, 0)::bigint,
    coalesce(pc.pending_count, 0)::bigint,
    coalesce(pc.rejected_count, 0)::bigint,
    coalesce(pc.total_views, 0)::bigint,
    coalesce(l.total_likes, 0)::bigint,
    coalesce(cr.total_comments_received, 0)::bigint,
    coalesce(mc.my_comments_count, 0)::bigint,
    coalesce(mb.my_bookmarks_count, 0)::bigint
  from my_post_counts pc
  cross join likes l
  cross join comments_received cr
  cross join my_comments mc
  cross join my_bookmarks mb;
$$;

grant execute on function public.get_my_dashboard_stats() to authenticated;

-- 5) Public engagement counters (safe aggregates for UI)
-- Expose only counts (no rows) to anon/authenticated.
create or replace function public.get_post_bookmark_count(post_slug text)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.blog_post_bookmarks b
  join public.blog_posts p on p.id = b.post_id
  where p.slug = post_slug
    and p.status::text = 'published';
$$;

grant execute on function public.get_post_bookmark_count(text) to anon, authenticated;

-- END: blog_engagement_bookmarks.sql


-- =====================================================
-- BEGIN: blog_member_contributors.sql
-- =====================================================

-- Member contributors, pending submissions, and admin review
-- Ø´ØºÙ‘Ù„ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù Ø¨Ø¹Ø¯ blog_schema.sql Ùˆ blog_auth_comments.sql

do $$
begin
  alter type public.blog_post_status add value if not exists 'pending';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.blog_post_status add value if not exists 'rejected';
exception
  when duplicate_object then null;
end $$;

alter table public.blog_posts
  add column if not exists author_user_id uuid references auth.users (id) on delete set null;

alter table public.blog_posts
  add column if not exists author_display_name text;

alter table public.blog_posts
  add column if not exists author_avatar_url text;

alter table public.blog_posts
  add column if not exists reviewed_at timestamptz;

alter table public.blog_posts
  add column if not exists review_note text;

create table if not exists public.site_admins (
  email text primary key,
  display_name text,
  created_at timestamptz not null default now()
);

-- Ø¨Ø¹Ø¯ ØªØ´ØºÙŠÙ„ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù Ø£Ø¶Ù Ø¨Ø±ÙŠØ¯ Ø­Ø³Ø§Ø¨Ùƒ Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠ Ù‡Ù†Ø§:
-- insert into public.site_admins (email, display_name)
-- values ('you@example.com', 'Owner')
-- on conflict (email) do update set display_name = excluded.display_name;

create index if not exists blog_posts_author_user_id_idx
  on public.blog_posts (author_user_id, created_at desc);

create index if not exists blog_posts_status_author_user_id_idx
  on public.blog_posts (status, author_user_id, created_at desc);

drop policy if exists blog_posts_member_read_own on public.blog_posts;
create policy blog_posts_member_read_own
on public.blog_posts
for select
to authenticated
using (author_user_id = auth.uid());

drop policy if exists blog_posts_member_insert_own on public.blog_posts;
create policy blog_posts_member_insert_own
on public.blog_posts
for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and status::text = 'pending'
);

drop policy if exists blog_posts_member_update_own on public.blog_posts;
create policy blog_posts_member_update_own
on public.blog_posts
for update
to authenticated
using (author_user_id = auth.uid())
with check (
  author_user_id = auth.uid()
  -- Any edit from a member re-sends the post to admin review, even if it was published before.
  and status::text = 'pending'
);

drop policy if exists blog_posts_member_delete_own on public.blog_posts;
create policy blog_posts_member_delete_own
on public.blog_posts
for delete
to authenticated
using (author_user_id = auth.uid());

drop policy if exists blog_posts_admin_review_read on public.blog_posts;
create policy blog_posts_admin_review_read
on public.blog_posts
for select
to authenticated
using (
  exists (
    select 1
    from public.site_admins admins
    where lower(admins.email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
);

drop policy if exists blog_posts_admin_review_update on public.blog_posts;
create policy blog_posts_admin_review_update
on public.blog_posts
for update
to authenticated
using (
  exists (
    select 1
    from public.site_admins admins
    where lower(admins.email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
)
with check (
  exists (
    select 1
    from public.site_admins admins
    where lower(admins.email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
);

-- END: blog_member_contributors.sql


-- =====================================================
-- BEGIN: blog_notifications_gamification.sql
-- =====================================================

-- Notifications + gamification (levels) + weekly challenges
-- Ø´ØºÙ‘Ù„ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù Ø¨Ø¹Ø¯:
-- blog_schema.sql + blog_auth_comments.sql + blog_member_contributors.sql + blog_engagement_bookmarks.sql

-- 1) XP / levels storage (keep it minimal and secure)
alter table public.user_profiles
  add column if not exists total_xp int not null default 0;

create index if not exists user_profiles_total_xp_idx
  on public.user_profiles (total_xp desc);

-- Prevent users from editing total_xp directly (they can still update their profile fields).
drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and total_xp = (select up.total_xp from public.user_profiles up where up.id = auth.uid())
);

-- 2) Notifications table
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_id_idx
  on public.user_notifications (user_id, is_read, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists user_notifications_select_own on public.user_notifications;
create policy user_notifications_select_own
on public.user_notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own
on public.user_notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_notifications_delete_own on public.user_notifications;
create policy user_notifications_delete_own
on public.user_notifications
for delete
to authenticated
using (auth.uid() = user_id);

-- 3) Helpers (SECURITY DEFINER) for triggers
create or replace function public.add_user_xp(target_user_id uuid, xp_delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id is null then
    return;
  end if;

  update public.user_profiles
  set total_xp = greatest(0, coalesce(total_xp, 0) + coalesce(xp_delta, 0))
  where id = target_user_id;
end;
$$;

create or replace function public.notify_user(
  target_user_id uuid,
  notif_type text,
  notif_title text,
  notif_body text,
  notif_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id is null then
    return;
  end if;

  insert into public.user_notifications (user_id, type, title, body, data)
  values (target_user_id, coalesce(notif_type, 'info'), coalesce(notif_title, ''), notif_body, coalesce(notif_data, '{}'::jsonb));
end;
$$;

grant execute on function public.add_user_xp(uuid, int) to authenticated;
grant execute on function public.notify_user(uuid, text, text, text, jsonb) to authenticated;

-- 4) Triggers: post review -> notification + XP
create or replace function public.handle_blog_post_review_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_status text;
  new_status text;
begin
  if new.author_user_id is null then
    return null;
  end if;

  old_status := coalesce(old.status::text, '');
  new_status := coalesce(new.status::text, '');

  if old_status = new_status then
    return null;
  end if;

  if new_status = 'published' then
    perform public.add_user_xp(new.author_user_id, 80);
    perform public.notify_user(
      new.author_user_id,
      'post_approved',
      'ØªÙ… Ù‚Ø¨ÙˆÙ„ Ù…Ù‚Ø§Ù„Ùƒ ÙˆÙ†Ø´Ø±Ù‡',
      coalesce(new.title, ''),
      jsonb_build_object('post_id', new.id, 'post_slug', new.slug)
    );
  elsif new_status = 'rejected' then
    perform public.add_user_xp(new.author_user_id, 10);
    perform public.notify_user(
      new.author_user_id,
      'post_rejected',
      'ØªÙ… Ø±ÙØ¶ Ù…Ù‚Ø§Ù„Ùƒ',
      coalesce(new.review_note, 'ÙŠÙ…ÙƒÙ†Ùƒ ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ù‚Ø§Ù„ ÙˆØ¥Ø¹Ø§Ø¯Ø© Ø¥Ø±Ø³Ø§Ù„Ù‡ Ù„Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©.'),
      jsonb_build_object('post_id', new.id, 'post_slug', new.slug)
    );
  end if;

  return null;
end;
$$;

drop trigger if exists blog_posts_review_events on public.blog_posts;
create trigger blog_posts_review_events
after update on public.blog_posts
for each row
execute function public.handle_blog_post_review_events();

-- 5) Triggers: new comment on my post -> notification
create or replace function public.handle_blog_comment_notify_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_id uuid;
  post_title text;
  post_slug text;
  snippet text;
begin
  select author_user_id, title, slug
  into author_id, post_title, post_slug
  from public.blog_posts
  where id = new.post_id;

  if author_id is null or author_id = new.user_id then
    return null;
  end if;

  snippet := left(trim(coalesce(new.content, '')), 140);

  perform public.notify_user(
    author_id,
    'new_comment',
    'ØªØ¹Ù„ÙŠÙ‚ Ø¬Ø¯ÙŠØ¯ Ø¹Ù„Ù‰ Ù…Ù‚Ø§Ù„Ùƒ',
    coalesce(post_title, ''),
    jsonb_build_object('post_id', new.post_id, 'post_slug', post_slug, 'comment_id', new.id, 'snippet', snippet)
  );

  return null;
end;
$$;

drop trigger if exists blog_comments_notify_author on public.blog_comments;
create trigger blog_comments_notify_author
after insert on public.blog_comments
for each row
execute function public.handle_blog_comment_notify_author();

-- 6) Triggers: new like on my post -> notification
create or replace function public.handle_blog_post_like_notify_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_id uuid;
  post_title text;
  post_slug text;
begin
  select author_user_id, title, slug
  into author_id, post_title, post_slug
  from public.blog_posts
  where id = new.post_id;

  if author_id is null or author_id = new.user_id then
    return null;
  end if;

  perform public.notify_user(
    author_id,
    'new_like',
    'Ø¥Ø¹Ø¬Ø§Ø¨ Ø¬Ø¯ÙŠØ¯ Ø¹Ù„Ù‰ Ù…Ù‚Ø§Ù„Ùƒ',
    coalesce(post_title, ''),
    jsonb_build_object('post_id', new.post_id, 'post_slug', post_slug)
  );

  return null;
end;
$$;

drop trigger if exists blog_post_reactions_notify_author on public.blog_post_reactions;
create trigger blog_post_reactions_notify_author
after insert on public.blog_post_reactions
for each row
execute function public.handle_blog_post_like_notify_author();

-- 7) Weekly challenge (simple: publish 5 accepted posts this week)
create table if not exists public.weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  goal_published_posts int not null default 5,
  reward_xp int not null default 150,
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.weekly_challenges enable row level security;

drop policy if exists weekly_challenges_select_public on public.weekly_challenges;
create policy weekly_challenges_select_public
on public.weekly_challenges
for select
to anon, authenticated
using (true);

create table if not exists public.weekly_challenge_claims (
  challenge_id uuid not null references public.weekly_challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table public.weekly_challenge_claims enable row level security;

drop policy if exists weekly_challenge_claims_select_own on public.weekly_challenge_claims;
create policy weekly_challenge_claims_select_own
on public.weekly_challenge_claims
for select
to authenticated
using (auth.uid() = user_id);

-- Ensure weekly challenge row exists for current week (UTC week start).
create or replace function public.ensure_current_weekly_challenge()
returns public.weekly_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  week_start date;
  row public.weekly_challenges;
begin
  week_start := (date_trunc('week', (now() at time zone 'utc'))::date);

  insert into public.weekly_challenges (week_start, goal_published_posts, reward_xp, title, description)
  values (
    week_start,
    5,
    150,
    'ØªØ­Ø¯ÙŠ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹',
    'Ø§Ù†Ø´Ø± 5 Ù…Ù‚Ø§Ù„Ø§Øª Ù…Ù‚Ø¨ÙˆÙ„Ø© Ù‡Ø°Ø§ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ Ù„ØªØ­ØµÙ„ Ø¹Ù„Ù‰ Ù…ÙƒØ§ÙØ£Ø© Ø®Ø¨Ø±Ø©.'
  )
  on conflict (week_start) do update
  set goal_published_posts = excluded.goal_published_posts,
      reward_xp = excluded.reward_xp,
      title = excluded.title,
      description = excluded.description
  returning * into row;

  return row;
end;
$$;

grant execute on function public.ensure_current_weekly_challenge() to authenticated;

-- One RPC that powers the account UI (level + rank + weekly progress)
create or replace function public.get_my_gamification_summary()
returns table (
  total_xp int,
  level_label text,
  rank_label text,
  published_posts bigint,
  weekly_goal int,
  weekly_progress bigint,
  weekly_reward_xp int,
  weekly_claimed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  challenge public.weekly_challenges;
  xp int;
  published_total bigint;
  weekly_count bigint;
  level_text text;
  rank_text text;
  is_claimed boolean;
begin
  challenge := public.ensure_current_weekly_challenge();

  select coalesce(up.total_xp, 0) into xp
  from public.user_profiles up
  where up.id = auth.uid();

  select count(*)::bigint into published_total
  from public.blog_posts
  where author_user_id = auth.uid()
    and status::text = 'published';

  select count(*)::bigint into weekly_count
  from public.blog_posts
  where author_user_id = auth.uid()
    and status::text = 'published'
    and (published_at at time zone 'utc')::date >= challenge.week_start
    and (published_at at time zone 'utc')::date < (challenge.week_start + 7);

  select exists (
    select 1 from public.weekly_challenge_claims c
    where c.challenge_id = challenge.id
      and c.user_id = auth.uid()
  ) into is_claimed;

  if xp >= 1000 then
    level_text := 'Ø¨Ø§Ø±Ø²';
  elsif xp >= 500 then
    level_text := 'Ù…ØªÙˆØ³Ø·';
  elsif xp >= 200 then
    level_text := 'Ù…Ø¨ØªØ¯Ø¦';
  else
    level_text := 'Ø¬Ø¯ÙŠØ¯';
  end if;

  if published_total >= 11 then
    rank_text := 'Ø¨Ø§Ø±Ø²';
  elsif published_total >= 6 then
    rank_text := 'Ù…ØªÙˆØ³Ø·';
  elsif published_total >= 3 then
    rank_text := 'Ù…Ø¨ØªØ¯Ø¦';
  else
    rank_text := 'Ø¬Ø¯ÙŠØ¯';
  end if;

  total_xp := xp;
  level_label := level_text;
  rank_label := rank_text;
  published_posts := published_total;
  weekly_goal := challenge.goal_published_posts;
  weekly_progress := weekly_count;
  weekly_reward_xp := challenge.reward_xp;
  weekly_claimed := is_claimed;

  return next;
end;
$$;

grant execute on function public.get_my_gamification_summary() to authenticated;

-- Claim weekly reward (once)
create or replace function public.claim_weekly_challenge_reward()
returns table (
  awarded_xp int,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  challenge public.weekly_challenges;
  weekly_count bigint;
  already_claimed boolean;
begin
  challenge := public.ensure_current_weekly_challenge();

  select count(*)::bigint into weekly_count
  from public.blog_posts
  where author_user_id = auth.uid()
    and status::text = 'published'
    and (published_at at time zone 'utc')::date >= challenge.week_start
    and (published_at at time zone 'utc')::date < (challenge.week_start + 7);

  select exists (
    select 1 from public.weekly_challenge_claims c
    where c.challenge_id = challenge.id
      and c.user_id = auth.uid()
  ) into already_claimed;

  if already_claimed then
    awarded_xp := 0;
    message := 'ØªÙ… Ø§Ø³ØªÙ„Ø§Ù… Ù…ÙƒØ§ÙØ£Ø© Ù‡Ø°Ø§ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ Ø¨Ø§Ù„ÙØ¹Ù„.';
    return next;
    return;
  end if;

  if weekly_count < challenge.goal_published_posts then
    awarded_xp := 0;
    message := 'Ù„Ù… ØªÙƒØªÙ…Ù„ Ù…Ù‡Ù…Ø© Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ Ø¨Ø¹Ø¯.';
    return next;
    return;
  end if;

  insert into public.weekly_challenge_claims (challenge_id, user_id)
  values (challenge.id, auth.uid());

  perform public.add_user_xp(auth.uid(), challenge.reward_xp);
  perform public.notify_user(auth.uid(), 'weekly_reward', 'Ù…ÙƒØ§ÙØ£Ø© Ø§Ù„ØªØ­Ø¯ÙŠ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ', 'ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ù…ÙƒØ§ÙØ£Ø© Ø§Ù„Ø®Ø¨Ø±Ø© Ø¥Ù„Ù‰ Ø­Ø³Ø§Ø¨Ùƒ.', jsonb_build_object('reward_xp', challenge.reward_xp));

  awarded_xp := challenge.reward_xp;
  message := 'ØªÙ… Ø§Ø³ØªÙ„Ø§Ù… Ù…ÙƒØ§ÙØ£Ø© Ø§Ù„ØªØ­Ø¯ÙŠ Ø¨Ù†Ø¬Ø§Ø­.';
  return next;
end;
$$;

grant execute on function public.claim_weekly_challenge_reward() to authenticated;


-- END: blog_notifications_gamification.sql


-- =====================================================
-- BEGIN: blog_storage.sql
-- =====================================================

-- Blog media storage setup (DEV / public uploads)
-- Creates a public bucket for article media and allows uploads/reads.
-- Review these policies before production use.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-media',
  'blog-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "blog media public read" on storage.objects;
create policy "blog media public read"
on storage.objects
for select
to public
using (bucket_id = 'blog-media');

drop policy if exists "blog media public upload" on storage.objects;
create policy "blog media public upload"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'blog-media');

drop policy if exists "blog media public update" on storage.objects;
create policy "blog media public update"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'blog-media')
with check (bucket_id = 'blog-media');

drop policy if exists "blog media public delete" on storage.objects;
create policy "blog media public delete"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'blog-media');

-- END: blog_storage.sql


-- =====================================================
-- BEGIN: blog_temp_publishing.sql
-- =====================================================

-- TEMP Publishing Policies (DEV ONLY)
-- ÙŠØ³Ù…Ø­ Ù„Ù„Ù†Ø´Ø± Ù…Ù† /admin/blog Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… anon key Ø¨Ø¯ÙˆÙ† ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„.
-- ØºÙŠØ± Ø¢Ù…Ù† Ù„Ù„Ø¥Ù†ØªØ§Ø¬. Ø§Ø­Ø°ÙÙ‡/Ø¹Ø·Ù„Ù‡ Ù„Ø§Ø­Ù‚Ù‹Ø§ ÙˆØ§Ø³ØªØ¹Ù…Ù„ Service Role Ø£Ùˆ Auth.

alter table public.blog_posts enable row level security;
alter table public.blog_post_assets enable row level security;
alter table public.blog_post_links enable row level security;

-- Posts
drop policy if exists blog_posts_insert_temp on public.blog_posts;
create policy blog_posts_insert_temp
on public.blog_posts
for insert
to anon, authenticated
with check (true);

drop policy if exists blog_posts_update_temp on public.blog_posts;
create policy blog_posts_update_temp
on public.blog_posts
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists blog_posts_delete_temp on public.blog_posts;
create policy blog_posts_delete_temp
on public.blog_posts
for delete
to anon, authenticated
using (true);

-- Assets
drop policy if exists blog_assets_insert_temp on public.blog_post_assets;
create policy blog_assets_insert_temp
on public.blog_post_assets
for insert
to anon, authenticated
with check (true);

-- Links
drop policy if exists blog_links_insert_temp on public.blog_post_links;
create policy blog_links_insert_temp
on public.blog_post_links
for insert
to anon, authenticated
with check (true);

-- END: blog_temp_publishing.sql

