create table if not exists public.narrative_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  narrative_key text not null,
  severity text not null default 'medium',
  created_at timestamptz not null default now(),
  unique(user_id, narrative_key)
);

create table if not exists public.operator_alert_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  target_type text not null,
  target_key text not null,
  severity text not null default 'medium',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, target_type, target_key)
);

create table if not exists public.operator_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  source text not null,
  title text not null,
  detail text,
  severity text not null default 'medium',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null,
  status text not null default 'queued',
  narrative_key text,
  result_brief_id uuid references public.briefs(id) on delete set null,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.signal_contradictions (
  id uuid primary key default gen_random_uuid(),
  signal_a_id uuid references public.signals(id) on delete cascade not null,
  signal_b_id uuid references public.signals(id) on delete cascade not null,
  score numeric not null default 0,
  rationale text,
  created_at timestamptz not null default now(),
  unique(signal_a_id, signal_b_id)
);

alter table public.narrative_subscriptions enable row level security;
alter table public.operator_alert_preferences enable row level security;
alter table public.operator_alerts enable row level security;
alter table public.agent_runs enable row level security;
alter table public.signal_contradictions enable row level security;

drop policy if exists "operators manage own narrative subscriptions" on public.narrative_subscriptions;
create policy "operators manage own narrative subscriptions"
  on public.narrative_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "operators manage own alert preferences" on public.operator_alert_preferences;
create policy "operators manage own alert preferences"
  on public.operator_alert_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "operators read own alerts" on public.operator_alerts;
create policy "operators read own alerts"
  on public.operator_alerts for select
  using (auth.uid() = user_id or user_id is null);

drop policy if exists "operators update own alerts" on public.operator_alerts;
create policy "operators update own alerts"
  on public.operator_alerts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "operators read agent runs" on public.agent_runs;
create policy "operators read agent runs"
  on public.agent_runs for select
  using (true);

drop policy if exists "operators create agent runs" on public.agent_runs;
create policy "operators create agent runs"
  on public.agent_runs for insert
  with check (auth.uid() = created_by);

drop policy if exists "operators read signal contradictions" on public.signal_contradictions;
create policy "operators read signal contradictions"
  on public.signal_contradictions for select
  using (true);
