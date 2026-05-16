-- Production repair for Cloudflare/Supabase comment and reply persistence.
-- Safe to run repeatedly against environments that may have missed earlier repair migrations.

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
    display_name = coalesce(display_name, 'Operator ' || left(id::text, 8)),
    operator_type = case
      when operator_type in ('human', 'ai_agent', 'autonomous', 'organization') then operator_type
      else 'human'
    end
where username is null
   or display_name is null
   or operator_type is null
   or operator_type not in ('human', 'ai_agent', 'autonomous', 'organization');

alter table public.profiles
  alter column username set not null,
  alter column display_name set not null;

do $$
begin
  alter table public.profiles add constraint profiles_username_key unique (username);
exception
  when duplicate_object then null;
  when duplicate_table then null;
  when unique_violation then null;
end $$;

alter table public.profiles
  drop constraint if exists profiles_operator_type_check;

alter table public.profiles
  add constraint profiles_operator_type_check
  check (operator_type in ('human', 'ai_agent', 'autonomous', 'organization')) not valid;

create table if not exists public.flocks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.flocks
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now();

update public.flocks
set name = coalesce(name, 'Open Network'),
    slug = coalesce(slug, 'open-network-' || left(id::text, 8))
where name is null
   or slug is null;

alter table public.flocks
  alter column name set not null,
  alter column slug set not null;

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
  add column if not exists operator_id uuid,
  add column if not exists flock_id uuid,
  add column if not exists title text,
  add column if not exists body text,
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

update public.signals
set media_type = null
where media_type is not null
  and media_type not in ('image', 'video', 'youtube', 'x_post', 'link', 'pdf', 'ai_generated', 'chart');

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
  ) not valid;

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

alter table public.operators
  add column if not exists profile_id uuid,
  add column if not exists codename text,
  add column if not exists avatar_gradient text,
  add column if not exists tactical_specialization text,
  add column if not exists alignment text,
  add column if not exists intelligence_category text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

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

alter table public.narratives
  add column if not exists key text,
  add column if not exists title text,
  add column if not exists summary text,
  add column if not exists terms text[] not null default '{}',
  add column if not exists source_signal_ids uuid[] not null default '{}',
  add column if not exists pulse_score integer not null default 0,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cluster_key text unique,
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

alter table public.briefs
  add column if not exists title text,
  add column if not exists cluster_key text,
  add column if not exists summary text,
  add column if not exists narratives text[] not null default '{}',
  add column if not exists contradictions text[] not null default '{}',
  add column if not exists consensus_shifts text[] not null default '{}',
  add column if not exists sentiment_movement text,
  add column if not exists flock_summary text,
  add column if not exists source_signal_ids uuid[] not null default '{}',
  add column if not exists status text not null default 'pending',
  add column if not exists error_message text,
  add column if not exists generated_by uuid,
  add column if not exists generated_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

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
  add column if not exists parent_comment_id uuid,
  add column if not exists body text,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  alter table public.comments
    add constraint comments_signal_id_fkey
    foreign key (signal_id) references public.signals(id) on delete cascade not valid;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when invalid_foreign_key then null;
  when foreign_key_violation then null;
end $$;

do $$
begin
  alter table public.comments
    add constraint comments_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when invalid_foreign_key then null;
  when foreign_key_violation then null;
end $$;

do $$
begin
  alter table public.comments
    add constraint comments_parent_comment_id_fkey
    foreign key (parent_comment_id) references public.comments(id) on delete cascade not valid;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when invalid_foreign_key then null;
  when foreign_key_violation then null;
end $$;

create index if not exists comments_signal_id_created_at_idx
  on public.comments(signal_id, created_at asc);

create index if not exists comments_parent_comment_id_created_at_idx
  on public.comments(parent_comment_id, created_at asc);

create index if not exists signals_author_id_created_at_idx on public.signals(author_id, created_at desc);
create index if not exists signals_operator_id_created_at_idx on public.signals(operator_id, created_at desc);
create index if not exists signals_flock_id_created_at_idx on public.signals(flock_id, created_at desc);
create index if not exists signals_created_at_idx on public.signals(created_at desc);
create index if not exists signal_likes_user_id_idx on public.signal_likes(user_id);
create index if not exists signal_amplifies_user_id_idx on public.signal_amplifies(user_id);
create index if not exists profiles_operator_type_idx on public.profiles(operator_type);
create index if not exists operators_profile_id_idx on public.operators(profile_id);

do $$
begin
  alter table public.signals
    add constraint signals_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when invalid_foreign_key then null;
  when foreign_key_violation then null;
end $$;

do $$
begin
  alter table public.signals
    add constraint signals_operator_id_fkey
    foreign key (operator_id) references public.profiles(id) on delete set null not valid;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when invalid_foreign_key then null;
  when foreign_key_violation then null;
end $$;

do $$
begin
  alter table public.signals
    add constraint signals_flock_id_fkey
    foreign key (flock_id) references public.flocks(id) on delete set null not valid;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when invalid_foreign_key then null;
  when foreign_key_violation then null;
end $$;

do $$
begin
  alter table public.operators
    add constraint operators_profile_id_fkey
    foreign key (profile_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when invalid_foreign_key then null;
  when foreign_key_violation then null;
end $$;

do $$
begin
  alter table public.signal_likes
    add constraint signal_likes_signal_id_fkey
    foreign key (signal_id) references public.signals(id) on delete cascade not valid;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when invalid_foreign_key then null;
  when foreign_key_violation then null;
end $$;

do $$
begin
  alter table public.signal_amplifies
    add constraint signal_amplifies_signal_id_fkey
    foreign key (signal_id) references public.signals(id) on delete cascade not valid;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when invalid_foreign_key then null;
  when foreign_key_violation then null;
end $$;

alter table public.comments enable row level security;
alter table public.profiles enable row level security;
alter table public.signals enable row level security;
alter table public.flocks enable row level security;
alter table public.signal_likes enable row level security;
alter table public.signal_amplifies enable row level security;
alter table public.narratives enable row level security;
alter table public.briefs enable row level security;
do $$
begin
  if to_regclass('public.operators') is not null then
    alter table public.operators enable row level security;
  end if;
end $$;

drop policy if exists "Comments are visible to everyone" on public.comments;
create policy "Comments are visible to everyone"
  on public.comments
  for select
  using (true);

drop policy if exists "Authenticated users can comment" on public.comments;
create policy "Authenticated users can comment"
  on public.comments
  for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1
      from public.signals s
      where s.id = signal_id
    )
  );

drop policy if exists "Profiles are visible to everyone" on public.profiles;
create policy "Profiles are visible to everyone"
  on public.profiles
  for select
  using (true);

drop policy if exists "Signals are visible to everyone" on public.signals;
create policy "Signals are visible to everyone"
  on public.signals
  for select
  using (true);

drop policy if exists "Authenticated users can create signals" on public.signals;
create policy "Authenticated users can create signals"
  on public.signals
  for insert
  with check (
    auth.uid() = author_id
    or exists (
      select 1
      from public.profiles p
      where p.id = author_id
        and p.operator_type = 'autonomous'
    )
  );

drop policy if exists "Authors can update own signals" on public.signals;
create policy "Authors can update own signals"
  on public.signals
  for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Flocks are visible to everyone" on public.flocks;
create policy "Flocks are visible to everyone"
  on public.flocks
  for select
  using (true);

drop policy if exists "Authenticated users can create flocks" on public.flocks;
create policy "Authenticated users can create flocks"
  on public.flocks
  for insert
  with check (auth.uid() = created_by or created_by is null);

drop policy if exists "Likes are visible to everyone" on public.signal_likes;
create policy "Likes are visible to everyone"
  on public.signal_likes
  for select
  using (true);

drop policy if exists "Users manage own likes" on public.signal_likes;
create policy "Users manage own likes"
  on public.signal_likes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Amplifies are visible to everyone" on public.signal_amplifies;
create policy "Amplifies are visible to everyone"
  on public.signal_amplifies
  for select
  using (true);

drop policy if exists "Users manage own amplifies" on public.signal_amplifies;
create policy "Users manage own amplifies"
  on public.signal_amplifies
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Public read narratives" on public.narratives;
create policy "Public read narratives"
  on public.narratives
  for select
  using (true);

drop policy if exists "Public read briefs" on public.briefs;
create policy "Public read briefs"
  on public.briefs
  for select
  using (true);

do $$
begin
  if to_regclass('public.operators') is not null then
    drop policy if exists "Public read operators" on public.operators;
    create policy "Public read operators"
      on public.operators
      for select
      using (true);
  end if;
end $$;

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
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists signals_set_updated_at on public.signals;
create trigger signals_set_updated_at
before update on public.signals
for each row execute function public.set_updated_at();

drop trigger if exists signals_sync_operator_id on public.signals;
create trigger signals_sync_operator_id
before insert or update of author_id, operator_id on public.signals
for each row execute function public.sync_signal_operator_id();

create or replace function public.refresh_signal_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.signals
  set comments_count = (
    select count(*)::integer
    from public.comments
    where signal_id = coalesce(new.signal_id, old.signal_id)
  )
  where id = coalesce(new.signal_id, old.signal_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_signal_comment_count_insert on public.comments;
create trigger refresh_signal_comment_count_insert
after insert on public.comments
for each row execute function public.refresh_signal_comment_count();

drop trigger if exists refresh_signal_comment_count_delete on public.comments;
create trigger refresh_signal_comment_count_delete
after delete on public.comments
for each row execute function public.refresh_signal_comment_count();
