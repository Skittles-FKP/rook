create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key,
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
  codename text,
  avatar_gradient text,
  tactical_specialization text,
  alignment text,
  intelligence_category text,
  invite_code text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  add column if not exists codename text,
  add column if not exists avatar_gradient text,
  add column if not exists tactical_specialization text,
  add column if not exists alignment text,
  add column if not exists intelligence_category text,
  add column if not exists invite_code text,
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
  media_type text,
  media_url text,
  media_urls text[] not null default '{}',
  thumbnail_url text,
  image_url text,
  video_url text,
  reference_url text,
  chart_url text,
  embed_url text,
  attachments jsonb not null default '[]'::jsonb,
  og_title text,
  og_description text,
  og_image text,
  media_metadata jsonb not null default '{}'::jsonb,
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
  add column if not exists media_type text,
  add column if not exists media_url text,
  add column if not exists media_urls text[] not null default '{}',
  add column if not exists thumbnail_url text,
  add column if not exists image_url text,
  add column if not exists video_url text,
  add column if not exists reference_url text,
  add column if not exists chart_url text,
  add column if not exists embed_url text,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists og_title text,
  add column if not exists og_description text,
  add column if not exists og_image text,
  add column if not exists media_metadata jsonb not null default '{}'::jsonb,
  add column if not exists confidence_score integer,
  add column if not exists ai_narrative_tags text[] not null default '{}',
  add column if not exists contradiction_score integer,
  add column if not exists sentiment_overlay text,
  add column if not exists likes_count integer not null default 0,
  add column if not exists amplifies_count integer not null default 0,
  add column if not exists comments_count integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.signals
  drop constraint if exists signals_media_type_check;

alter table public.signals
  add constraint signals_media_type_check
  check (
    media_type is null or media_type in (
      'image',
      'video',
      'youtube',
      'x_post',
      'link',
      'pdf',
      'ai_generated',
      'chart'
    )
  );

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null,
  author_id uuid not null,
  parent_comment_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);

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
  metadata jsonb not null default '{}'::jsonb,
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

create table if not exists public.narrative_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  narrative_key text not null,
  severity text not null default 'medium',
  created_at timestamptz not null default now(),
  unique(user_id, narrative_key)
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

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  organization_id uuid,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.operator_entitlements (
  user_id uuid primary key,
  tier text not null default 'free',
  usage jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.operator_profile_extensions (
  user_id uuid primary key,
  banner_url text,
  portfolio_links jsonb not null default '[]'::jsonb,
  specializations text[] not null default '{}',
  verification_status text not null default 'provisional',
  achievements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.operators (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  codename text,
  specialization text,
  category text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  name text not null,
  slug text not null unique,
  visibility text not null default 'private',
  created_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid,
  waitlist_entry_id uuid,
  approved_email text,
  uses_count integer not null default 0,
  max_uses integer not null default 10,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  invited_by text,
  role text,
  referral_code text,
  status text not null default 'pending',
  approved_at timestamptz,
  invite_code text,
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

create index if not exists profiles_operator_type_idx on public.profiles(operator_type);
create index if not exists signals_created_at_idx on public.signals(created_at desc);
create index if not exists signals_author_id_idx on public.signals(author_id, created_at desc);
create index if not exists signals_operator_id_created_at_idx on public.signals(operator_id, created_at desc);
create index if not exists signals_media_type_created_at_idx on public.signals(media_type, created_at desc);
create index if not exists signals_media_metadata_idx on public.signals using gin(media_metadata);
create index if not exists signals_attachments_idx on public.signals using gin(attachments);
create index if not exists comments_signal_id_idx on public.comments(signal_id, created_at asc);
create index if not exists follows_following_id_idx on public.follows(following_id);
create index if not exists graph_edges_source_idx on public.graph_edges(source_type, source_id);
create index if not exists graph_edges_target_idx on public.graph_edges(target_type, target_id);
create index if not exists pulse_events_created_at_idx on public.pulse_events(created_at desc);
create index if not exists workspace_signals_signal_id_idx on public.workspace_signals(signal_id);
create index if not exists external_signal_ingest_converted_signal_id_idx on public.external_signal_ingest(converted_signal_id);
create index if not exists waitlist_entries_created_at_idx on public.waitlist_entries(created_at desc);
create index if not exists signal_reports_status_idx on public.signal_reports(status, created_at desc);
create index if not exists operators_profile_id_idx on public.operators(profile_id);
create index if not exists workspaces_organization_id_idx on public.workspaces(organization_id);

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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists signals_set_updated_at on public.signals;
create trigger signals_set_updated_at before update on public.signals for each row execute function public.set_updated_at();

drop trigger if exists signals_sync_operator_id on public.signals;
create trigger signals_sync_operator_id before insert or update of author_id, operator_id on public.signals for each row execute function public.sync_signal_operator_id();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'rook-media',
    'rook-media',
    true,
    26214400,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'application/pdf']
  ),
  (
    'signal-images',
    'signal-images',
    true,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'signal-videos',
    'signal-videos',
    true,
    26214400,
    array['video/mp4', 'video/webm', 'video/quicktime']
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

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
alter table public.intelligence_rooms enable row level security;
alter table public.room_brief_sessions enable row level security;
alter table public.narrative_subscriptions enable row level security;
alter table public.operator_alert_preferences enable row level security;
alter table public.operator_alerts enable row level security;
alter table public.agent_runs enable row level security;
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
alter table public.operators enable row level security;
alter table public.workspaces enable row level security;
alter table public.invite_codes enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.signal_reports enable row level security;

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

drop policy if exists "Flock members are visible to everyone" on public.flock_members;
create policy "Flock members are visible to everyone" on public.flock_members for select using (true);
drop policy if exists "Users manage own flock membership" on public.flock_members;
create policy "Users manage own flock membership" on public.flock_members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Public read briefs" on public.briefs;
create policy "Public read briefs" on public.briefs for select using (true);
drop policy if exists "Public read narratives" on public.narratives;
create policy "Public read narratives" on public.narratives for select using (true);
drop policy if exists "Public read graph edges" on public.graph_edges;
create policy "Public read graph edges" on public.graph_edges for select using (true);
drop policy if exists "Public read signal contradictions" on public.signal_contradictions;
create policy "Public read signal contradictions" on public.signal_contradictions for select using (true);
drop policy if exists "Public read signal pulse metadata" on public.signal_pulse_metadata;
create policy "Public read signal pulse metadata" on public.signal_pulse_metadata for select using (true);
drop policy if exists "Public read pulse events" on public.pulse_events;
create policy "Public read pulse events" on public.pulse_events for select using (true);
drop policy if exists "Public read pulse clusters" on public.pulse_clusters;
create policy "Public read pulse clusters" on public.pulse_clusters for select using (true);
drop policy if exists "Public read intelligence rooms" on public.intelligence_rooms;
create policy "Public read intelligence rooms" on public.intelligence_rooms for select using (true);
drop policy if exists "Public read room brief sessions" on public.room_brief_sessions;
create policy "Public read room brief sessions" on public.room_brief_sessions for select using (true);
drop policy if exists "Users manage own narrative subscriptions" on public.narrative_subscriptions;
create policy "Users manage own narrative subscriptions" on public.narrative_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "operators manage own alert preferences" on public.operator_alert_preferences;
create policy "operators manage own alert preferences" on public.operator_alert_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "operators read own alerts" on public.operator_alerts;
create policy "operators read own alerts" on public.operator_alerts for select using (auth.uid() = user_id or user_id is null);
drop policy if exists "operators update own alerts" on public.operator_alerts;
create policy "operators update own alerts" on public.operator_alerts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Public read agent runs" on public.agent_runs;
create policy "Public read agent runs" on public.agent_runs for select using (true);

drop policy if exists "Public read organizations" on public.organizations;
create policy "Public read organizations" on public.organizations for select using (true);
drop policy if exists "Public read organization members" on public.organization_members;
create policy "Public read organization members" on public.organization_members for select using (true);
drop policy if exists "Public read workspace signals" on public.workspace_signals;
create policy "Public read workspace signals" on public.workspace_signals for select using (true);
drop policy if exists "operators read queue status" on public.ai_queue_jobs;
create policy "operators read queue status" on public.ai_queue_jobs for select using (auth.uid() is not null);
drop policy if exists "Authenticated read external sources" on public.external_sources;
create policy "Authenticated read external sources" on public.external_sources for select using (auth.role() = 'authenticated');
drop policy if exists "Authenticated read external signal ingest" on public.external_signal_ingest;
create policy "Authenticated read external signal ingest" on public.external_signal_ingest for select using (auth.role() = 'authenticated');
drop policy if exists "Authenticated read signal embeddings" on public.signal_embeddings;
create policy "Authenticated read signal embeddings" on public.signal_embeddings for select using (auth.role() = 'authenticated');
drop policy if exists "operators insert own usage events" on public.usage_events;
create policy "operators insert own usage events" on public.usage_events for insert with check (auth.uid() = user_id or user_id is null);
drop policy if exists "Users read own entitlements" on public.operator_entitlements;
create policy "Users read own entitlements" on public.operator_entitlements for select using (auth.uid() = user_id);
drop policy if exists "Public read operator extensions" on public.operator_profile_extensions;
create policy "Public read operator extensions" on public.operator_profile_extensions for select using (true);
drop policy if exists "operators manage own profile extensions" on public.operator_profile_extensions;
create policy "operators manage own profile extensions" on public.operator_profile_extensions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Public read operators" on public.operators;
create policy "Public read operators" on public.operators for select using (true);
drop policy if exists "Operators manage own operator row" on public.operators;
create policy "Operators manage own operator row" on public.operators for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "Workspace members can read workspaces" on public.workspaces;
create policy "Workspace members can read workspaces" on public.workspaces for select using (true);
drop policy if exists "Authenticated users can create workspaces" on public.workspaces;
create policy "Authenticated users can create workspaces" on public.workspaces for insert with check (auth.uid() = created_by or created_by is null);
drop policy if exists "Invite codes are visible to everyone" on public.invite_codes;
create policy "Invite codes are visible to everyone" on public.invite_codes for select using (true);
drop policy if exists "Anyone can join waitlist" on public.waitlist_entries;
create policy "Anyone can join waitlist" on public.waitlist_entries for insert with check (true);
drop policy if exists "Authenticated users can report signals" on public.signal_reports;
create policy "Authenticated users can report signals" on public.signal_reports for insert with check (auth.uid() = reporter_id or reporter_id is null);
drop policy if exists "Signal reports visible to authenticated users" on public.signal_reports;
create policy "Signal reports visible to authenticated users" on public.signal_reports for select using (auth.role() = 'authenticated');

drop policy if exists "Rook media is publicly readable" on storage.objects;
create policy "Rook media is publicly readable"
on storage.objects for select
using (bucket_id in ('rook-media', 'signal-images', 'signal-videos'));

drop policy if exists "Operators can upload own feed media" on storage.objects;
create policy "Operators can upload own feed media"
on storage.objects for insert
with check (
  bucket_id in ('rook-media', 'signal-images', 'signal-videos')
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Operators can update own feed media" on storage.objects;
create policy "Operators can update own feed media"
on storage.objects for update
using (
  bucket_id in ('rook-media', 'signal-images', 'signal-videos')
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id in ('rook-media', 'signal-images', 'signal-videos')
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Operators can delete own feed media" on storage.objects;
create policy "Operators can delete own feed media"
on storage.objects for delete
using (
  bucket_id in ('rook-media', 'signal-images', 'signal-videos')
  and auth.uid()::text = (storage.foldername(name))[1]
);
