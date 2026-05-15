create extension if not exists vector;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text not null default 'enterprise',
  classification text not null default 'internal',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'operator',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.workspace_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  signal_id uuid references public.signals(id) on delete cascade not null,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  unique(organization_id, signal_id)
);

create table if not exists public.ai_queue_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  target_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  priority integer not null default 1,
  locked_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.external_sources (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  label text not null,
  status text not null default 'paused',
  cadence text not null default '15 min',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.external_signal_ingest (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.external_sources(id) on delete set null,
  external_key text not null,
  title text not null,
  body text,
  url text,
  author_ref text,
  raw_payload jsonb not null default '{}'::jsonb,
  converted_signal_id uuid references public.signals(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(source_id, external_key)
);

create table if not exists public.signal_embeddings (
  signal_id uuid primary key references public.signals(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.operator_entitlements (
  user_id uuid references public.profiles(id) on delete cascade not null,
  tier text not null default 'free',
  usage jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

create table if not exists public.operator_profile_extensions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  banner_url text,
  portfolio_links jsonb not null default '[]'::jsonb,
  specializations text[] not null default '{}',
  verification_status text not null default 'unverified',
  achievements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.workspace_signals enable row level security;
alter table public.ai_queue_jobs enable row level security;
alter table public.external_sources enable row level security;
alter table public.external_signal_ingest enable row level security;
alter table public.signal_embeddings enable row level security;
alter table public.usage_events enable row level security;
alter table public.operator_entitlements enable row level security;
alter table public.operator_profile_extensions enable row level security;

drop policy if exists "members can read their organizations" on public.organizations;
create policy "members can read their organizations"
  on public.organizations for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = organizations.id
      and organization_members.user_id = auth.uid()
    )
  );

drop policy if exists "members can read org membership" on public.organization_members;
create policy "members can read org membership"
  on public.organization_members for select
  using (user_id = auth.uid() or exists (
    select 1 from public.organization_members member
    where member.organization_id = organization_members.organization_id
    and member.user_id = auth.uid()
  ));

drop policy if exists "members can read workspace signals" on public.workspace_signals;
create policy "members can read workspace signals"
  on public.workspace_signals for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = workspace_signals.organization_id
      and organization_members.user_id = auth.uid()
    )
  );

drop policy if exists "operators read queue status" on public.ai_queue_jobs;
create policy "operators read queue status"
  on public.ai_queue_jobs for select
  using (auth.uid() is not null);

drop policy if exists "operators read external sources" on public.external_sources;
create policy "operators read external sources"
  on public.external_sources for select
  using (auth.uid() is not null);

drop policy if exists "operators read ingested items" on public.external_signal_ingest;
create policy "operators read ingested items"
  on public.external_signal_ingest for select
  using (auth.uid() is not null);

drop policy if exists "operators read signal embeddings" on public.signal_embeddings;
create policy "operators read signal embeddings"
  on public.signal_embeddings for select
  using (auth.uid() is not null);

drop policy if exists "operators insert own usage events" on public.usage_events;
create policy "operators insert own usage events"
  on public.usage_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "operators read own entitlements" on public.operator_entitlements;
create policy "operators read own entitlements"
  on public.operator_entitlements for select
  using (auth.uid() = user_id);

drop policy if exists "operators manage own profile extensions" on public.operator_profile_extensions;
create policy "operators manage own profile extensions"
  on public.operator_profile_extensions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
