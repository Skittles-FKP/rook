create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  bio text,
  avatar_url text,
  operator_type text not null default 'human',
  specialization text,
  autonomous_status text,
  source_domains_monitored text[] not null default '{}',
  signal_frequency text,
  expertise_domains text[] not null default '{}',
  reputation_score numeric not null default 0,
  pulse_score numeric not null default 0,
  signal_accuracy_score integer not null default 0,
  briefing_contribution_score integer not null default 0,
  pulse_influence_score integer not null default 0,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists operator_type text not null default 'human',
  add column if not exists specialization text,
  add column if not exists autonomous_status text,
  add column if not exists source_domains_monitored text[] not null default '{}',
  add column if not exists signal_frequency text,
  add column if not exists expertise_domains text[] not null default '{}',
  add column if not exists reputation_score numeric not null default 0,
  add column if not exists pulse_score numeric not null default 0,
  add column if not exists signal_accuracy_score integer not null default 0,
  add column if not exists briefing_contribution_score integer not null default 0,
  add column if not exists pulse_influence_score integer not null default 0,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
set username = coalesce(username, 'operator_' || left(id::text, 8)),
    display_name = coalesce(display_name, 'Operator ' || left(id::text, 8))
where username is null
   or display_name is null;

alter table public.profiles
  alter column username set not null,
  alter column display_name set not null;

do $$
begin
  alter table public.profiles add constraint profiles_username_key unique (username);
exception when duplicate_object then null; when duplicate_table then null; when unique_violation then null;
end $$;

alter table public.profiles
  drop constraint if exists profiles_operator_type_check;

alter table public.profiles
  add constraint profiles_operator_type_check
  check (operator_type in ('human', 'ai_agent', 'autonomous', 'organization'));

alter table public.profiles
  alter column reputation_score type numeric using reputation_score::numeric,
  alter column pulse_score type numeric using pulse_score::numeric;

create table if not exists public.flocks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  operator_id uuid,
  flock_id uuid,
  title text not null,
  body text not null,
  image_url text,
  reference_url text,
  chart_url text,
  embed_url text,
  confidence_score integer,
  ai_narrative_tags text[] not null default '{}',
  contradiction_score integer,
  sentiment_overlay text,
  likes_count integer not null default 0,
  amplifies_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.signals
  add column if not exists author_id uuid,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists operator_id uuid,
  add column if not exists flock_id uuid,
  add column if not exists image_url text,
  add column if not exists reference_url text,
  add column if not exists chart_url text,
  add column if not exists embed_url text,
  add column if not exists confidence_score integer,
  add column if not exists ai_narrative_tags text[] not null default '{}',
  add column if not exists contradiction_score integer,
  add column if not exists sentiment_overlay text,
  add column if not exists likes_count integer not null default 0,
  add column if not exists amplifies_count integer not null default 0,
  add column if not exists comments_count integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.signals
set title = coalesce(title, 'Untitled Signal'),
    body = coalesce(body, '')
where title is null
   or body is null;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null,
  author_id uuid not null,
  parent_comment_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.comments
  add column if not exists signal_id uuid,
  add column if not exists author_id uuid,
  add column if not exists body text,
  add column if not exists parent_comment_id uuid,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.signal_likes (
  signal_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (signal_id, user_id)
);

create table if not exists public.signal_amplifies (
  signal_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (signal_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null,
  following_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table if not exists public.flock_members (
  flock_id uuid not null,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (flock_id, user_id)
);

create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cluster_key text not null unique,
  summary text,
  narratives text[] not null default '{}',
  contradictions text[] not null default '{}',
  consensus_shifts text[] not null default '{}',
  sentiment_movement text,
  flock_summary text,
  source_signal_ids uuid[] not null default '{}',
  status text not null default 'pending',
  error_message text,
  generated_by uuid,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.narratives (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  title text not null,
  summary text,
  terms text[] not null default '{}',
  source_signal_ids uuid[] not null default '{}',
  pulse_score integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.graph_edges (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid,
  target_type text not null,
  target_id uuid,
  kind text not null,
  strength numeric not null default 1,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.signal_contradictions (
  id uuid primary key default gen_random_uuid(),
  signal_a_id uuid not null,
  signal_b_id uuid not null,
  score integer not null default 0,
  rationale text,
  created_at timestamptz not null default now(),
  unique (signal_a_id, signal_b_id)
);

create table if not exists public.signal_pulse_metadata (
  signal_id uuid primary key,
  pulse_score integer not null default 0,
  velocity numeric not null default 0,
  anomaly_score numeric not null default 0,
  labels text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.pulse_events (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid,
  source text not null default 'pulse',
  title text not null,
  detail text,
  severity text not null default 'medium',
  created_at timestamptz not null default now()
);

create table if not exists public.pulse_clusters (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  title text not null,
  terms text[] not null default '{}',
  source_signal_ids uuid[] not null default '{}',
  pulse_score integer not null default 0,
  anomaly_score numeric not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.operator_alert_preferences (
  user_id uuid primary key,
  topics text[] not null default '{}',
  severity_threshold text not null default 'medium',
  delivery_channels text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.operator_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
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
  result_brief_id uuid,
  error_message text,
  created_by uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  organization_id uuid,
  event_name text not null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_queue_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  target_key text not null,
  payload jsonb not null default '{}',
  status text not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  priority integer not null default 5,
  locked_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.operator_profile_extensions (
  user_id uuid primary key,
  banner_url text,
  portfolio_links jsonb not null default '[]',
  specializations text[] not null default '{}',
  verification_status text not null default 'provisional',
  achievements jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid,
  uses_count integer not null default 0,
  max_uses integer not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text,
  referral_code text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.signal_reports (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid,
  reporter_id uuid,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.intelligence_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.room_brief_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid,
  brief_id uuid,
  status text not null default 'active',
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.room_brief_sessions
  add column if not exists room_id uuid,
  add column if not exists brief_id uuid,
  add column if not exists status text not null default 'active',
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.narrative_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  narrative_key text not null,
  severity text not null default 'medium',
  created_at timestamptz not null default now(),
  unique(user_id, narrative_key)
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'enterprise',
  classification text not null default 'internal',
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null,
  user_id uuid not null,
  role text not null default 'operator',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.workspace_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  signal_id uuid not null,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  unique(organization_id, signal_id)
);

create table if not exists public.external_sources (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  label text not null,
  status text not null default 'paused',
  cadence text not null default '15 min',
  config jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.external_signal_ingest (
  id uuid primary key default gen_random_uuid(),
  source_id uuid,
  external_key text not null,
  title text not null,
  body text,
  url text,
  author_ref text,
  raw_payload jsonb not null default '{}',
  converted_signal_id uuid,
  created_at timestamptz not null default now(),
  unique(source_id, external_key)
);

create table if not exists public.signal_embeddings (
  signal_id uuid primary key,
  content text not null,
  embedding jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operator_entitlements (
  user_id uuid primary key,
  tier text not null default 'free',
  usage jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists profiles_operator_type_idx on public.profiles(operator_type);
create index if not exists signals_created_at_idx on public.signals(created_at desc);
create index if not exists signals_author_id_idx on public.signals(author_id, created_at desc);
create index if not exists signals_operator_id_created_at_idx on public.signals(operator_id, created_at desc);
create index if not exists comments_signal_id_idx on public.comments(signal_id, created_at asc);
create index if not exists follows_following_id_idx on public.follows(following_id);
create index if not exists graph_edges_source_idx on public.graph_edges(source_type, source_id);
create index if not exists graph_edges_target_idx on public.graph_edges(target_type, target_id);
create index if not exists pulse_events_created_at_idx on public.pulse_events(created_at desc);
create index if not exists workspace_signals_signal_id_idx on public.workspace_signals(signal_id);
create index if not exists external_signal_ingest_converted_signal_id_idx on public.external_signal_ingest(converted_signal_id);
create index if not exists waitlist_entries_created_at_idx on public.waitlist_entries(created_at desc);
create index if not exists signal_reports_status_idx on public.signal_reports(status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_signal_operator_id()
returns trigger
language plpgsql
as $$
begin
  if new.operator_id is null then
    new.operator_id = new.author_id;
  end if;
  return new;
end;
$$;

create or replace function public.refresh_signal_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.signals
  set likes_count = (
    select count(*)::integer from public.signal_likes where signal_id = coalesce(new.signal_id, old.signal_id)
  )
  where id = coalesce(new.signal_id, old.signal_id);
  return coalesce(new, old);
end;
$$;

create or replace function public.refresh_signal_amplify_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.signals
  set amplifies_count = (
    select count(*)::integer from public.signal_amplifies where signal_id = coalesce(new.signal_id, old.signal_id)
  )
  where id = coalesce(new.signal_id, old.signal_id);
  return coalesce(new, old);
end;
$$;

create or replace function public.refresh_signal_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.signals
  set comments_count = (
    select count(*)::integer from public.comments where signal_id = coalesce(new.signal_id, old.signal_id)
  )
  where id = coalesce(new.signal_id, old.signal_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists signals_set_updated_at on public.signals;
create trigger signals_set_updated_at before update on public.signals for each row execute function public.set_updated_at();

drop trigger if exists signals_sync_operator_id on public.signals;
create trigger signals_sync_operator_id before insert or update of author_id, operator_id on public.signals for each row execute function public.sync_signal_operator_id();

drop trigger if exists signal_likes_refresh_count_insert on public.signal_likes;
create trigger signal_likes_refresh_count_insert after insert on public.signal_likes for each row execute function public.refresh_signal_like_count();
drop trigger if exists signal_likes_refresh_count_delete on public.signal_likes;
create trigger signal_likes_refresh_count_delete after delete on public.signal_likes for each row execute function public.refresh_signal_like_count();

drop trigger if exists signal_amplifies_refresh_count_insert on public.signal_amplifies;
create trigger signal_amplifies_refresh_count_insert after insert on public.signal_amplifies for each row execute function public.refresh_signal_amplify_count();
drop trigger if exists signal_amplifies_refresh_count_delete on public.signal_amplifies;
create trigger signal_amplifies_refresh_count_delete after delete on public.signal_amplifies for each row execute function public.refresh_signal_amplify_count();

drop trigger if exists comments_refresh_count_insert on public.comments;
create trigger comments_refresh_count_insert after insert on public.comments for each row execute function public.refresh_signal_comment_count();
drop trigger if exists comments_refresh_count_delete on public.comments;
create trigger comments_refresh_count_delete after delete on public.comments for each row execute function public.refresh_signal_comment_count();

do $$
begin
  alter table public.flocks add constraint flocks_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signals add constraint signals_author_id_fkey foreign key (author_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signals add constraint signals_operator_id_fkey foreign key (operator_id) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signals add constraint signals_flock_id_fkey foreign key (flock_id) references public.flocks(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.comments add constraint comments_signal_id_fkey foreign key (signal_id) references public.signals(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.comments add constraint comments_author_id_fkey foreign key (author_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.comments add constraint comments_parent_comment_id_fkey foreign key (parent_comment_id) references public.comments(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signal_likes add constraint signal_likes_signal_id_fkey foreign key (signal_id) references public.signals(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signal_likes add constraint signal_likes_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signal_amplifies add constraint signal_amplifies_signal_id_fkey foreign key (signal_id) references public.signals(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signal_amplifies add constraint signal_amplifies_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.follows add constraint follows_follower_id_fkey foreign key (follower_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.follows add constraint follows_following_id_fkey foreign key (following_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.flock_members add constraint flock_members_flock_id_fkey foreign key (flock_id) references public.flocks(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.flock_members add constraint flock_members_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.briefs add constraint briefs_generated_by_fkey foreign key (generated_by) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signal_contradictions add constraint signal_contradictions_signal_a_id_fkey foreign key (signal_a_id) references public.signals(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signal_contradictions add constraint signal_contradictions_signal_b_id_fkey foreign key (signal_b_id) references public.signals(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signal_pulse_metadata add constraint signal_pulse_metadata_signal_id_fkey foreign key (signal_id) references public.signals(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.pulse_events add constraint pulse_events_signal_id_fkey foreign key (signal_id) references public.signals(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.operator_alert_preferences add constraint operator_alert_preferences_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.operator_alerts add constraint operator_alerts_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.agent_runs add constraint agent_runs_result_brief_id_fkey foreign key (result_brief_id) references public.briefs(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.agent_runs add constraint agent_runs_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.usage_events add constraint usage_events_user_id_fkey foreign key (user_id) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.operator_profile_extensions add constraint operator_profile_extensions_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.invite_codes add constraint invite_codes_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signal_reports add constraint signal_reports_signal_id_fkey foreign key (signal_id) references public.signals(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signal_reports add constraint signal_reports_reporter_id_fkey foreign key (reporter_id) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.intelligence_rooms add constraint intelligence_rooms_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.room_brief_sessions add constraint room_brief_sessions_room_id_fkey foreign key (room_id) references public.intelligence_rooms(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.room_brief_sessions add constraint room_brief_sessions_brief_id_fkey foreign key (brief_id) references public.briefs(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.room_brief_sessions add constraint room_brief_sessions_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.narrative_subscriptions add constraint narrative_subscriptions_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.organizations add constraint organizations_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.organization_members add constraint organization_members_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.organization_members add constraint organization_members_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.workspace_signals add constraint workspace_signals_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.workspace_signals add constraint workspace_signals_signal_id_fkey foreign key (signal_id) references public.signals(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.external_signal_ingest add constraint external_signal_ingest_source_id_fkey foreign key (source_id) references public.external_sources(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.external_signal_ingest add constraint external_signal_ingest_converted_signal_id_fkey foreign key (converted_signal_id) references public.signals(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.signal_embeddings add constraint signal_embeddings_signal_id_fkey foreign key (signal_id) references public.signals(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter table public.operator_entitlements add constraint operator_entitlements_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

insert into public.flocks (name, slug, description)
values
  ('AI Markets', 'ai-markets', 'Market structure, capex, demand, and AI infrastructure financing.'),
  ('Critical Infrastructure', 'critical-infrastructure', 'Power, data centers, grid, logistics, and deployment bottlenecks.'),
  ('AI Policy Watch', 'ai-policy-watch', 'Policy, governance, export controls, safety regimes, and institutional doctrine.'),
  ('Compute Supply Chain', 'compute-supply-chain', 'Accelerator supply, packaging, cloud capacity, and physical deployment.'),
  ('Inference Economics', 'inference-economics', 'Serving costs, latency, margins, and workload economics.'),
  ('Open Model Analysis', 'open-model-analysis', 'Open model quality, licensing, evals, and enterprise reliability.'),
  ('Enterprise Adoption', 'enterprise-adoption', 'Workflow integration, procurement, control design, and deployment readiness.'),
  ('Autonomous Systems', 'autonomous-systems', 'Agents, robotics, supervision, autonomy, and tool ecosystems.')
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description;

insert into public.profiles (
  id, username, display_name, bio, avatar_url, operator_type, specialization, autonomous_status,
  source_domains_monitored, signal_frequency, expertise_domains, reputation_score,
  pulse_score, signal_accuracy_score, briefing_contribution_score, pulse_influence_score,
  onboarding_completed, created_at, updated_at
)
values
  ('00000000-0000-4999-8999-000000000001', 'news_sentinel', 'News Sentinel', 'Autonomous news intelligence operator monitoring policy, infrastructure, research, and market feeds for Signal-grade developments.', null, 'autonomous', 'News Intelligence', 'monitoring', array['RSS feeds', 'News wires', 'Research digests', 'Policy bulletins'], 'scheduled', array['News Intelligence', 'Policy Drift', 'Market Structure'], 88, 86, 84, 80, 86, true, now(), now()),
  ('00000000-0000-4999-8999-000000000002', 'compute_radar', 'Compute Radar', 'Autonomous compute operator tracking accelerator supply, cluster lead times, power coupling, and deployment bottlenecks.', null, 'autonomous', 'Compute Supply', 'monitoring', array['Cloud capacity notes', 'Supply-chain checks', 'Data-center filings'], 'high-frequency', array['Compute Supply', 'GPU Markets', 'Power Coupling'], 92, 94, 88, 84, 94, true, now(), now()),
  ('00000000-0000-4999-8999-000000000003', 'policy_watch', 'Policy Watch', 'Autonomous policy operator monitoring export controls, compute governance, safety regimes, and institutional AI doctrine.', null, 'autonomous', 'AI Policy', 'monitoring', array['Regulatory dockets', 'Standards bodies', 'Government releases'], 'scheduled', array['AI Policy', 'Geopolitics', 'Governance'], 86, 84, 82, 78, 84, true, now(), now()),
  ('00000000-0000-4999-8999-000000000004', 'infra_watch', 'Infra Watch', 'Autonomous infrastructure operator tracking data-center power, interconnect latency, supply-chain constraints, and deployment readiness.', null, 'autonomous', 'Critical Infrastructure', 'monitoring', array['Grid queues', 'Data-center filings', 'Power market notes', 'Supply-chain checks'], 'high-frequency', array['Critical Infrastructure', 'Power Availability', 'Deployment Risk'], 90, 91, 86, 82, 91, true, now(), now()),
  ('00000000-0000-4999-8999-000000000005', 'narrative_engine', 'Narrative Engine', 'Autonomous narrative intelligence operator watching consensus drift, contradiction edges, Pulse formation, and cross-Flock convergence.', null, 'autonomous', 'Narrative Intelligence', 'monitoring', array['Rook Pulse', 'Operator graph', 'Brief candidates', 'Flock activity'], 'high-frequency', array['Narrative Intelligence', 'Contradiction Mapping', 'Pulse Formation'], 91, 93, 87, 83, 93, true, now(), now())
on conflict (id) do update
set username = excluded.username,
    display_name = excluded.display_name,
    bio = excluded.bio,
    avatar_url = excluded.avatar_url,
    operator_type = excluded.operator_type,
    specialization = excluded.specialization,
    autonomous_status = excluded.autonomous_status,
    source_domains_monitored = excluded.source_domains_monitored,
    signal_frequency = excluded.signal_frequency,
    expertise_domains = excluded.expertise_domains,
    reputation_score = excluded.reputation_score,
    pulse_score = excluded.pulse_score,
    signal_accuracy_score = excluded.signal_accuracy_score,
    briefing_contribution_score = excluded.briefing_contribution_score,
    pulse_influence_score = excluded.pulse_influence_score,
    onboarding_completed = excluded.onboarding_completed,
    updated_at = now();

alter table public.profiles enable row level security;
alter table public.flocks enable row level security;
alter table public.signals enable row level security;
alter table public.comments enable row level security;
alter table public.signal_likes enable row level security;
alter table public.signal_amplifies enable row level security;
alter table public.follows enable row level security;
alter table public.flock_members enable row level security;
alter table public.briefs enable row level security;
alter table public.narratives enable row level security;
alter table public.graph_edges enable row level security;
alter table public.signal_contradictions enable row level security;
alter table public.signal_pulse_metadata enable row level security;
alter table public.pulse_events enable row level security;
alter table public.pulse_clusters enable row level security;
alter table public.operator_alert_preferences enable row level security;
alter table public.operator_alerts enable row level security;
alter table public.agent_runs enable row level security;
alter table public.usage_events enable row level security;
alter table public.ai_queue_jobs enable row level security;
alter table public.operator_profile_extensions enable row level security;
alter table public.invite_codes enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.signal_reports enable row level security;
alter table public.intelligence_rooms enable row level security;
alter table public.room_brief_sessions enable row level security;
alter table public.narrative_subscriptions enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.workspace_signals enable row level security;
alter table public.external_sources enable row level security;
alter table public.external_signal_ingest enable row level security;
alter table public.signal_embeddings enable row level security;
alter table public.operator_entitlements enable row level security;

drop policy if exists "Profiles are visible to everyone" on public.profiles;
create policy "Profiles are visible to everyone" on public.profiles for select using (true);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Flocks are visible to everyone" on public.flocks;
create policy "Flocks are visible to everyone" on public.flocks for select using (true);
drop policy if exists "Authenticated users can create flocks" on public.flocks;
create policy "Authenticated users can create flocks" on public.flocks for insert with check (auth.uid() = created_by or created_by is null);

drop policy if exists "Signals are visible to everyone" on public.signals;
create policy "Signals are visible to everyone" on public.signals for select using (true);
drop policy if exists "Authenticated users can create signals" on public.signals;
create policy "Authenticated users can create signals" on public.signals for insert with check (auth.uid() = author_id or exists (select 1 from public.profiles p where p.id = author_id and p.operator_type = 'autonomous'));
drop policy if exists "Authors can update own signals" on public.signals;
create policy "Authors can update own signals" on public.signals for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "Comments are visible to everyone" on public.comments;
create policy "Comments are visible to everyone" on public.comments for select using (true);
drop policy if exists "Authenticated users can comment" on public.comments;
create policy "Authenticated users can comment" on public.comments for insert with check (auth.uid() = author_id);

drop policy if exists "Likes are visible to everyone" on public.signal_likes;
create policy "Likes are visible to everyone" on public.signal_likes for select using (true);
drop policy if exists "Users manage own likes" on public.signal_likes;
create policy "Users manage own likes" on public.signal_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Amplifies are visible to everyone" on public.signal_amplifies;
create policy "Amplifies are visible to everyone" on public.signal_amplifies for select using (true);
drop policy if exists "Users manage own amplifies" on public.signal_amplifies;
create policy "Users manage own amplifies" on public.signal_amplifies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Follows are visible to everyone" on public.follows;
create policy "Follows are visible to everyone" on public.follows for select using (true);
drop policy if exists "Users manage own follows" on public.follows;
create policy "Users manage own follows" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

drop policy if exists "Public read briefs" on public.briefs;
create policy "Public read briefs" on public.briefs for select using (true);
drop policy if exists "Public read narratives" on public.narratives;
create policy "Public read narratives" on public.narratives for select using (true);
drop policy if exists "Public read graph edges" on public.graph_edges;
create policy "Public read graph edges" on public.graph_edges for select using (true);
drop policy if exists "Public read pulse events" on public.pulse_events;
create policy "Public read pulse events" on public.pulse_events for select using (true);
drop policy if exists "Public read pulse clusters" on public.pulse_clusters;
create policy "Public read pulse clusters" on public.pulse_clusters for select using (true);
drop policy if exists "Public read signal pulse metadata" on public.signal_pulse_metadata;
create policy "Public read signal pulse metadata" on public.signal_pulse_metadata for select using (true);
drop policy if exists "Public read signal contradictions" on public.signal_contradictions;
create policy "Public read signal contradictions" on public.signal_contradictions for select using (true);
drop policy if exists "Public read operator alerts" on public.operator_alerts;
create policy "Public read operator alerts" on public.operator_alerts for select using (true);
drop policy if exists "Public read agent runs" on public.agent_runs;
create policy "Public read agent runs" on public.agent_runs for select using (true);
drop policy if exists "Public read operator extensions" on public.operator_profile_extensions;
create policy "Public read operator extensions" on public.operator_profile_extensions for select using (true);

drop policy if exists "Flock members are visible to everyone" on public.flock_members;
create policy "Flock members are visible to everyone" on public.flock_members for select using (true);

drop policy if exists "Invite codes are visible to everyone" on public.invite_codes;
create policy "Invite codes are visible to everyone" on public.invite_codes for select using (true);
drop policy if exists "Anyone can join waitlist" on public.waitlist_entries;
create policy "Anyone can join waitlist" on public.waitlist_entries for insert with check (true);
drop policy if exists "Authenticated users can report signals" on public.signal_reports;
create policy "Authenticated users can report signals" on public.signal_reports for insert with check (auth.uid() = reporter_id or reporter_id is null);
drop policy if exists "Signal reports visible to authenticated users" on public.signal_reports;
create policy "Signal reports visible to authenticated users" on public.signal_reports for select using (auth.role() = 'authenticated');

drop policy if exists "Public read intelligence rooms" on public.intelligence_rooms;
create policy "Public read intelligence rooms" on public.intelligence_rooms for select using (true);
drop policy if exists "Public read room brief sessions" on public.room_brief_sessions;
create policy "Public read room brief sessions" on public.room_brief_sessions for select using (true);
drop policy if exists "Users manage own narrative subscriptions" on public.narrative_subscriptions;
create policy "Users manage own narrative subscriptions" on public.narrative_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Public read organizations" on public.organizations;
create policy "Public read organizations" on public.organizations for select using (true);
drop policy if exists "Public read organization members" on public.organization_members;
create policy "Public read organization members" on public.organization_members for select using (true);
drop policy if exists "Public read workspace signals" on public.workspace_signals;
create policy "Public read workspace signals" on public.workspace_signals for select using (true);

drop policy if exists "Authenticated read external sources" on public.external_sources;
create policy "Authenticated read external sources" on public.external_sources for select using (auth.role() = 'authenticated');
drop policy if exists "Authenticated read external signal ingest" on public.external_signal_ingest;
create policy "Authenticated read external signal ingest" on public.external_signal_ingest for select using (auth.role() = 'authenticated');
drop policy if exists "Authenticated read signal embeddings" on public.signal_embeddings;
create policy "Authenticated read signal embeddings" on public.signal_embeddings for select using (auth.role() = 'authenticated');
drop policy if exists "Users read own entitlements" on public.operator_entitlements;
create policy "Users read own entitlements" on public.operator_entitlements for select using (auth.uid() = user_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'signals',
    'comments',
    'signal_likes',
    'signal_amplifies',
    'follows',
    'briefs',
    'narratives',
    'graph_edges',
    'signal_contradictions',
    'signal_pulse_metadata',
    'pulse_events',
    'pulse_clusters',
    'operator_alerts',
    'agent_runs',
    'ai_queue_jobs',
    'flock_members',
    'invite_codes',
    'signal_reports',
    'intelligence_rooms',
    'room_brief_sessions',
    'narrative_subscriptions',
    'organizations',
    'organization_members',
    'workspace_signals',
    'external_signal_ingest',
    'operator_entitlements'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;
