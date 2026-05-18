create table if not exists public.autonomous_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  username text not null unique,
  display_name text not null,
  status text not null default 'monitoring',
  domains text[] not null default '{}',
  source_domains text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  last_bootstrap_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.autonomous_profiles
  add column if not exists profile_id uuid,
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists status text not null default 'monitoring',
  add column if not exists domains text[] not null default '{}',
  add column if not exists source_domains text[] not null default '{}',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists last_bootstrap_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.ai_activity (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null,
  activity_type text not null default 'bootstrap',
  status text not null default 'ok',
  title text,
  detail text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_activity
  add column if not exists agent_key text,
  add column if not exists activity_type text not null default 'bootstrap',
  add column if not exists status text not null default 'ok',
  add column if not exists title text,
  add column if not exists detail text,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.operators (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  codename text,
  avatar_gradient text,
  tactical_specialization text,
  alignment text,
  intelligence_category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.narratives (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  title text not null default 'Untitled narrative',
  summary text,
  terms text[] not null default '{}',
  source_signal_ids uuid[] not null default '{}',
  pulse_score integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists autonomous_profiles_username_idx
  on public.autonomous_profiles(username);

create index if not exists autonomous_profiles_profile_id_idx
  on public.autonomous_profiles(profile_id);

create index if not exists ai_activity_agent_key_created_at_idx
  on public.ai_activity(agent_key, created_at desc);

alter table public.autonomous_profiles enable row level security;
alter table public.ai_activity enable row level security;
alter table public.operators enable row level security;
alter table public.narratives enable row level security;

drop policy if exists "Public read autonomous profiles" on public.autonomous_profiles;
create policy "Public read autonomous profiles"
  on public.autonomous_profiles
  for select
  using (true);

drop policy if exists "Authenticated read ai activity" on public.ai_activity;
create policy "Authenticated read ai activity"
  on public.ai_activity
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated insert ai activity" on public.ai_activity;
create policy "Authenticated insert ai activity"
  on public.ai_activity
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Public read operators" on public.operators;
create policy "Public read operators"
  on public.operators
  for select
  using (true);

drop policy if exists "Public read narratives" on public.narratives;
create policy "Public read narratives"
  on public.narratives
  for select
  using (true);

insert into public.autonomous_profiles (
  profile_id,
  username,
  display_name,
  status,
  domains,
  source_domains,
  metadata,
  last_bootstrap_at
)
select
  p.id,
  p.username,
  p.display_name,
  coalesce(p.autonomous_status, 'monitoring'),
  coalesce(p.expertise_domains, '{}'),
  coalesce(p.source_domains_monitored, '{}'),
  jsonb_build_object('source', '0020_rook_autonomous_news_agent_resilience'),
  now()
from public.profiles p
where p.username in (
  'news_sentinel',
  'compute_radar',
  'policy_watch',
  'infra_watch',
  'narrative_engine'
)
on conflict (username) do update
set
  profile_id = excluded.profile_id,
  display_name = excluded.display_name,
  status = excluded.status,
  domains = excluded.domains,
  source_domains = excluded.source_domains,
  metadata = autonomous_profiles.metadata || excluded.metadata,
  last_bootstrap_at = now(),
  updated_at = now();
