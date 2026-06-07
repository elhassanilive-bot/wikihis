create table if not exists public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  category text not null default 'كل التصنيفات',
  source text not null default 'website',
  status text not null default 'active' check (status in ('active', 'paused', 'unsubscribed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, category)
);

create index if not exists newsletter_subscriptions_status_idx
  on public.newsletter_subscriptions (status, updated_at desc);

alter table public.newsletter_subscriptions enable row level security;

drop policy if exists newsletter_subscriptions_insert_public on public.newsletter_subscriptions;
create policy newsletter_subscriptions_insert_public
on public.newsletter_subscriptions
for insert
to anon, authenticated
with check (
  email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  and status = 'active'
);

drop policy if exists newsletter_subscriptions_admin_read on public.newsletter_subscriptions;
create policy newsletter_subscriptions_admin_read
on public.newsletter_subscriptions
for select
to authenticated
using (true);
