-- Wikihat account features hardening.
-- Run this after:
--   supabase/blog_auth_comments.sql
--   supabase/blog_engagement_bookmarks.sql
--   supabase/blog_notifications_gamification.sql
--   supabase/005_lock_admin_access.sql
--
-- It refreshes account notifications, XP, weekly challenge, and dashboard RPCs
-- with clean Arabic text and safer permissions.

alter table public.user_profiles
  add column if not exists total_xp int not null default 0;

create index if not exists user_profiles_total_xp_idx
  on public.user_profiles (total_xp desc);

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

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and total_xp = (select coalesce(up.total_xp, 0) from public.user_profiles up where up.id = auth.uid())
);

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

  insert into public.user_profiles (id, total_xp)
  values (target_user_id, greatest(0, coalesce(xp_delta, 0)))
  on conflict (id) do update
  set total_xp = greatest(0, coalesce(public.user_profiles.total_xp, 0) + coalesce(excluded.total_xp, 0));
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
  values (
    target_user_id,
    coalesce(nullif(trim(notif_type), ''), 'info'),
    coalesce(nullif(trim(notif_title), ''), 'تنبيه جديد'),
    nullif(trim(coalesce(notif_body, '')), ''),
    coalesce(notif_data, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.add_user_xp(uuid, int) from public;
revoke all on function public.notify_user(uuid, text, text, text, jsonb) from public;

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
    return new;
  end if;

  old_status := coalesce(old.status::text, '');
  new_status := coalesce(new.status::text, '');

  if old_status = new_status then
    return new;
  end if;

  if new_status = 'published' then
    perform public.add_user_xp(new.author_user_id, 80);
    perform public.notify_user(
      new.author_user_id,
      'post_approved',
      'تم قبول مقالك ونشره',
      coalesce(new.title, ''),
      jsonb_build_object('post_id', new.id, 'post_slug', new.slug)
    );
  elsif new_status = 'rejected' then
    perform public.add_user_xp(new.author_user_id, 10);
    perform public.notify_user(
      new.author_user_id,
      'post_rejected',
      'تم رفض مقالك',
      coalesce(nullif(trim(new.review_note), ''), 'يمكنك تعديل المقال وإعادة إرساله للمراجعة.'),
      jsonb_build_object('post_id', new.id, 'post_slug', new.slug)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists blog_posts_review_events on public.blog_posts;
create trigger blog_posts_review_events
after update on public.blog_posts
for each row
execute function public.handle_blog_post_review_events();

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
    return new;
  end if;

  snippet := left(trim(coalesce(new.content, '')), 140);

  perform public.notify_user(
    author_id,
    'new_comment',
    'تعليق جديد على مقالك',
    coalesce(post_title, snippet, ''),
    jsonb_build_object('post_id', new.post_id, 'post_slug', post_slug, 'comment_id', new.id, 'snippet', snippet)
  );

  return new;
end;
$$;

drop trigger if exists blog_comments_notify_author on public.blog_comments;
create trigger blog_comments_notify_author
after insert on public.blog_comments
for each row
execute function public.handle_blog_comment_notify_author();

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
  if coalesce(new.reaction_type, '') <> 'like' then
    return new;
  end if;

  select author_user_id, title, slug
  into author_id, post_title, post_slug
  from public.blog_posts
  where id = new.post_id;

  if author_id is null or author_id = new.user_id then
    return new;
  end if;

  perform public.notify_user(
    author_id,
    'new_like',
    'إعجاب جديد على مقالك',
    coalesce(post_title, ''),
    jsonb_build_object('post_id', new.post_id, 'post_slug', post_slug)
  );

  return new;
end;
$$;

drop trigger if exists blog_post_reactions_notify_author on public.blog_post_reactions;
create trigger blog_post_reactions_notify_author
after insert on public.blog_post_reactions
for each row
execute function public.handle_blog_post_like_notify_author();

-- Backfill badge data for posts that existed before this hardening migration.
with author_xp as (
  select
    author_user_id,
    (
      count(*) filter (where status::text = 'published') * 80
      + count(*) filter (where status::text = 'rejected') * 10
    )::int as earned_xp
  from public.blog_posts
  where author_user_id is not null
    and status::text in ('published', 'rejected')
  group by author_user_id
)
insert into public.user_profiles (id, total_xp)
select author_user_id, greatest(0, earned_xp)
from author_xp
where earned_xp > 0
on conflict (id) do update
set total_xp = greatest(coalesce(public.user_profiles.total_xp, 0), excluded.total_xp);

insert into public.user_notifications (user_id, type, title, body, data, created_at)
select
  posts.author_user_id,
  'post_approved',
  'تم قبول مقالك ونشره',
  coalesce(posts.title, ''),
  jsonb_build_object('post_id', posts.id, 'post_slug', posts.slug),
  coalesce(posts.published_at, posts.updated_at, posts.created_at, now())
from public.blog_posts posts
where posts.author_user_id is not null
  and posts.status::text = 'published'
  and not exists (
    select 1
    from public.user_notifications existing
    where existing.user_id = posts.author_user_id
      and existing.type = 'post_approved'
      and existing.data->>'post_id' = posts.id::text
  );

insert into public.user_notifications (user_id, type, title, body, data, created_at)
select
  posts.author_user_id,
  'post_rejected',
  'تم رفض مقالك',
  coalesce(nullif(trim(posts.review_note), ''), 'يمكنك تعديل المقال وإعادة إرساله للمراجعة.'),
  jsonb_build_object('post_id', posts.id, 'post_slug', posts.slug),
  coalesce(posts.updated_at, posts.created_at, now())
from public.blog_posts posts
where posts.author_user_id is not null
  and posts.status::text = 'rejected'
  and not exists (
    select 1
    from public.user_notifications existing
    where existing.user_id = posts.author_user_id
      and existing.type = 'post_rejected'
      and existing.data->>'post_id' = posts.id::text
  );

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

create or replace function public.ensure_current_weekly_challenge()
returns public.weekly_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  current_week_start date;
  row public.weekly_challenges;
begin
  current_week_start := date_trunc('week', (now() at time zone 'utc'))::date;

  insert into public.weekly_challenges (week_start, goal_published_posts, reward_xp, title, description)
  values (
    current_week_start,
    5,
    150,
    'تحدي الأسبوع',
    'انشر 5 مقالات مقبولة هذا الأسبوع لتحصل على مكافأة خبرة.'
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
  is_claimed boolean;
begin
  challenge := public.ensure_current_weekly_challenge();

  select coalesce(up.total_xp, 0) into xp
  from public.user_profiles up
  where up.id = auth.uid();

  xp := coalesce(xp, 0);

  select count(*)::bigint into published_total
  from public.blog_posts
  where author_user_id = auth.uid()
    and status::text = 'published';

  select count(*)::bigint into weekly_count
  from public.blog_posts
  where author_user_id = auth.uid()
    and status::text = 'published'
    and published_at is not null
    and (published_at at time zone 'utc')::date >= challenge.week_start
    and (published_at at time zone 'utc')::date < (challenge.week_start + 7);

  select exists (
    select 1
    from public.weekly_challenge_claims c
    where c.challenge_id = challenge.id
      and c.user_id = auth.uid()
  ) into is_claimed;

  total_xp := xp;
  level_label := case
    when xp >= 1000 then 'بارز'
    when xp >= 500 then 'متوسط'
    when xp >= 200 then 'مبتدئ'
    else 'جديد'
  end;
  rank_label := case
    when published_total >= 11 then 'بارز'
    when published_total >= 6 then 'متوسط'
    when published_total >= 3 then 'مبتدئ'
    else 'جديد'
  end;
  published_posts := coalesce(published_total, 0);
  weekly_goal := challenge.goal_published_posts;
  weekly_progress := coalesce(weekly_count, 0);
  weekly_reward_xp := challenge.reward_xp;
  weekly_claimed := coalesce(is_claimed, false);

  return next;
end;
$$;

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
    and published_at is not null
    and (published_at at time zone 'utc')::date >= challenge.week_start
    and (published_at at time zone 'utc')::date < (challenge.week_start + 7);

  select exists (
    select 1
    from public.weekly_challenge_claims c
    where c.challenge_id = challenge.id
      and c.user_id = auth.uid()
  ) into already_claimed;

  if already_claimed then
    awarded_xp := 0;
    message := 'تم استلام مكافأة هذا الأسبوع بالفعل.';
    return next;
    return;
  end if;

  if weekly_count < challenge.goal_published_posts then
    awarded_xp := 0;
    message := 'لم تكتمل مهمة الأسبوع بعد.';
    return next;
    return;
  end if;

  insert into public.weekly_challenge_claims (challenge_id, user_id)
  values (challenge.id, auth.uid());

  perform public.add_user_xp(auth.uid(), challenge.reward_xp);
  perform public.notify_user(
    auth.uid(),
    'weekly_reward',
    'مكافأة التحدي الأسبوعي',
    'تمت إضافة مكافأة الخبرة إلى حسابك.',
    jsonb_build_object('reward_xp', challenge.reward_xp)
  );

  awarded_xp := challenge.reward_xp;
  message := 'تم استلام مكافأة التحدي بنجاح.';
  return next;
end;
$$;

-- Track authenticated article views so account analytics can show real activity.
create table if not exists public.blog_post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists blog_post_views_user_id_idx
  on public.blog_post_views (user_id, created_at desc);

create index if not exists blog_post_views_post_id_idx
  on public.blog_post_views (post_id, created_at desc);

alter table public.blog_post_views enable row level security;

drop policy if exists blog_post_views_insert_own on public.blog_post_views;
create policy blog_post_views_insert_own
on public.blog_post_views
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists blog_post_views_select_own on public.blog_post_views;
create policy blog_post_views_select_own
on public.blog_post_views
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.increment_post_view(post_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.blog_posts
  set view_count = coalesce(view_count, 0) + 1
  where slug = post_slug
    and status::text = 'published';
end;
$$;

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
      count(*) filter (where status_text = 'published') as published_count,
      count(*) filter (where status_text = 'pending') as pending_count,
      count(*) filter (where status_text = 'rejected') as rejected_count,
      coalesce(sum(view_count), 0) as total_views
    from my_posts
  ),
  likes as (
    select count(*)::bigint as total_likes
    from public.blog_post_reactions r
    join my_posts p on p.id = r.post_id
    where r.reaction_type = 'like'
  ),
  my_likes as (
    select count(*)::bigint as my_likes_count
    from public.blog_post_reactions
    where user_id = auth.uid()
      and reaction_type = 'like'
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
  ),
  my_view_events as (
    select count(*)::bigint as my_view_events_count
    from public.blog_post_views
    where user_id = auth.uid()
  )
  select
    coalesce(pc.published_count, 0)::bigint,
    coalesce(pc.pending_count, 0)::bigint,
    coalesce(pc.rejected_count, 0)::bigint,
    (coalesce(pc.total_views, 0) + coalesce(mv.my_view_events_count, 0))::bigint,
    (coalesce(l.total_likes, 0) + coalesce(ml.my_likes_count, 0))::bigint,
    (coalesce(cr.total_comments_received, 0) + coalesce(mc.my_comments_count, 0))::bigint,
    coalesce(mc.my_comments_count, 0)::bigint,
    coalesce(mb.my_bookmarks_count, 0)::bigint
  from my_post_counts pc
  cross join likes l
  cross join my_likes ml
  cross join comments_received cr
  cross join my_comments mc
  cross join my_bookmarks mb
  cross join my_view_events mv;
$$;

revoke all on function public.ensure_current_weekly_challenge() from public;
revoke all on function public.get_my_gamification_summary() from public;
revoke all on function public.claim_weekly_challenge_reward() from public;
revoke all on function public.get_my_dashboard_stats() from public;
revoke all on function public.increment_post_view(text) from public;

grant execute on function public.ensure_current_weekly_challenge() to authenticated;
grant execute on function public.get_my_gamification_summary() to authenticated;
grant execute on function public.claim_weekly_challenge_reward() to authenticated;
grant execute on function public.get_my_dashboard_stats() to authenticated;
grant execute on function public.increment_post_view(text) to anon, authenticated;
