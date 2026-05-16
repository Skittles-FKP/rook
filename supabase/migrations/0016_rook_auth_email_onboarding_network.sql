create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists codename text,
  add column if not exists avatar_gradient text,
  add column if not exists tactical_specialization text,
  add column if not exists alignment text,
  add column if not exists intelligence_category text,
  add column if not exists invite_code text;

alter table public.waitlist_entries
  add column if not exists source text,
  add column if not exists invited_by text,
  add column if not exists approved_at timestamptz,
  add column if not exists invite_code text;

alter table public.invite_codes
  add column if not exists waitlist_entry_id uuid,
  add column if not exists approved_email text,
  add column if not exists last_used_at timestamptz;

do $$
begin
  alter table public.invite_codes
    add constraint invite_codes_waitlist_entry_id_fkey
    foreign key (waitlist_entry_id) references public.waitlist_entries(id) on delete set null not valid;
exception when duplicate_object then null; when undefined_object then null;
end $$;

alter table public.waitlist_entries
  drop constraint if exists waitlist_status_check;

alter table public.waitlist_entries
  add constraint waitlist_status_check
  check (status in ('pending', 'approved', 'invited', 'rejected', 'converted'));

create table if not exists public.auth_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  email text,
  user_id uuid,
  provider text,
  status text not null default 'ok',
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint auth_events_status_check check (status in ('ok', 'failed', 'pending'))
);

create index if not exists auth_events_created_at_idx on public.auth_events(created_at desc);
create index if not exists auth_events_email_idx on public.auth_events(lower(email));
create index if not exists waitlist_entries_status_idx on public.waitlist_entries(status, created_at desc);
create index if not exists waitlist_entries_invite_code_idx on public.waitlist_entries(invite_code);
create index if not exists invite_codes_approved_email_idx on public.invite_codes(lower(approved_email));

create or replace function public.rook_slugify_identity(input text)
returns text
language sql
immutable
as $$
  select substr(trim(both '_' from regexp_replace(lower(coalesce(input, 'operator')), '[^a-z0-9_]', '_', 'g')), 1, 18);
$$;

create or replace function public.rook_operator_seed(input text)
returns integer
language plpgsql
immutable
as $$
declare
  digest bytea;
begin
  digest := digest(lower(coalesce(input, 'operator')), 'sha256');
  return (
    get_byte(digest, 0) * 16777216 +
    get_byte(digest, 1) * 65536 +
    get_byte(digest, 2) * 256 +
    get_byte(digest, 3)
  );
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate_username text;
  seed integer;
  invite text;
  generated_codename text;
  specialization text;
  category text;
  alignment_value text;
  gradient text;
  reputation numeric;
  pulse numeric;
  specializations text[] := array[
    'Infrastructure Analyst',
    'Policy Escalation',
    'Narrative Intelligence',
    'Compute Markets',
    'Geopolitical Signals'
  ];
  categories text[] := array['infrastructure', 'policy', 'narrative', 'compute', 'geopolitical'];
  alignments text[] := array['Signal Integrity', 'Critical Infrastructure', 'Policy Watch', 'Market Structure'];
  gradients text[] := array['cyan-indigo', 'blue-emerald', 'violet-cyan', 'slate-cyan', 'green-blue'];
begin
  seed := public.rook_operator_seed(coalesce(new.email, new.id::text));
  invite := nullif(new.raw_user_meta_data->>'invite_code', '');

  base_username := coalesce(
    nullif(public.rook_slugify_identity(new.raw_user_meta_data->>'username'), ''),
    nullif(public.rook_slugify_identity(split_part(new.email, '@', 1)), ''),
    'operator'
  );

  if char_length(base_username) < 3 then
    base_username := 'operator';
  end if;

  candidate_username := base_username;

  while exists (select 1 from public.profiles where username = candidate_username and id <> new.id) loop
    candidate_username := substr(base_username, 1, 18) || '_' || substr(new.id::text, 1, 5);
  end loop;

  generated_codename := coalesce(
    nullif(new.raw_user_meta_data->>'codename', ''),
    'ROOK-' || upper(substr(new.id::text, 1, 4))
  );
  specialization := coalesce(
    nullif(new.raw_user_meta_data->>'tactical_specialization', ''),
    specializations[(seed % array_length(specializations, 1)) + 1]
  );
  category := coalesce(
    nullif(new.raw_user_meta_data->>'intelligence_category', ''),
    categories[(seed % array_length(categories, 1)) + 1]
  );
  alignment_value := coalesce(
    nullif(new.raw_user_meta_data->>'alignment', ''),
    alignments[(seed % array_length(alignments, 1)) + 1]
  );
  gradient := coalesce(
    nullif(new.raw_user_meta_data->>'avatar_gradient', ''),
    gradients[(seed % array_length(gradients, 1)) + 1]
  );
  reputation := coalesce(nullif(new.raw_user_meta_data->>'reputation_score', '')::numeric, 24 + (seed % 12));
  pulse := coalesce(nullif(new.raw_user_meta_data->>'pulse_score', '')::numeric, 18 + (seed % 18));

  insert into public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    operator_type,
    specialization,
    expertise_domains,
    reputation_score,
    pulse_score,
    pulse_influence_score,
    onboarding_completed,
    codename,
    avatar_gradient,
    tactical_specialization,
    alignment,
    intelligence_category,
    invite_code
  )
  values (
    new.id,
    candidate_username,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), generated_codename),
    new.raw_user_meta_data->>'avatar_url',
    'human',
    specialization,
    array[specialization, alignment_value],
    reputation,
    pulse,
    pulse::integer,
    true,
    generated_codename,
    gradient,
    specialization,
    alignment_value,
    category,
    invite
  )
  on conflict (id) do update
  set username = excluded.username,
      display_name = excluded.display_name,
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
      operator_type = excluded.operator_type,
      specialization = excluded.specialization,
      expertise_domains = excluded.expertise_domains,
      reputation_score = excluded.reputation_score,
      pulse_score = excluded.pulse_score,
      pulse_influence_score = excluded.pulse_influence_score,
      onboarding_completed = true,
      codename = excluded.codename,
      avatar_gradient = excluded.avatar_gradient,
      tactical_specialization = excluded.tactical_specialization,
      alignment = excluded.alignment,
      intelligence_category = excluded.intelligence_category,
      invite_code = excluded.invite_code,
      updated_at = now();

  insert into public.operator_entitlements (user_id, tier, usage)
  values (new.id, 'free', jsonb_build_object('starter_reputation', reputation, 'starter_pulse', pulse))
  on conflict (user_id) do update
  set usage = public.operator_entitlements.usage || excluded.usage,
      updated_at = now();

  insert into public.operator_profile_extensions (user_id, specializations, verification_status, achievements)
  values (
    new.id,
    array[specialization],
    'provisional',
    jsonb_build_array(jsonb_build_object('label', 'Operator identity generated', 'awarded_at', now()))
  )
  on conflict (user_id) do update
  set specializations = excluded.specializations,
      verification_status = excluded.verification_status,
      achievements = excluded.achievements,
      updated_at = now();

  insert into public.graph_edges (source_type, source_id, target_type, target_id, kind, strength, metadata)
  values (
    'operator',
    new.id,
    'category',
    null,
    'identity_initialized',
    1,
    jsonb_build_object('category', category, 'alignment', alignment_value, 'specialization', specialization, 'invite_code', invite)
  );

  insert into public.operator_alerts (user_id, source, title, detail, severity)
  values (
    new.id,
    'auth',
    'Operator identity initialized',
    'Starter reputation, Pulse calibration, graph identity, and activity timeline are online.',
    'low'
  );

  insert into public.usage_events (user_id, event_name, properties)
  values (
    new.id,
    'operator.onboarded',
    jsonb_build_object('codename', generated_codename, 'specialization', specialization, 'invite_code', invite)
  );

  insert into public.auth_events (event_type, email, user_id, provider, status, metadata)
  values (
    'operator_profile_created',
    new.email,
    new.id,
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    'ok',
    jsonb_build_object('codename', generated_codename, 'specialization', specialization, 'invite_code', invite)
  );

  if invite is not null then
    update public.invite_codes
    set uses_count = uses_count + 1,
        last_used_at = now()
    where code = invite
      and uses_count < max_uses;

    update public.waitlist_entries
    set status = 'converted'
    where invite_code = invite
       or referral_code = invite
       or lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.auth_events enable row level security;

drop policy if exists "Auth events can be inserted by runtime" on public.auth_events;
create policy "Auth events can be inserted by runtime"
on public.auth_events for insert
with check (true);

drop policy if exists "Authenticated operators can read auth events" on public.auth_events;
create policy "Authenticated operators can read auth events"
on public.auth_events for select
using (auth.role() = 'authenticated');

drop policy if exists "Anyone can update waitlist entry by email" on public.waitlist_entries;
create policy "Anyone can update waitlist entry by email"
on public.waitlist_entries for update
using (true)
with check (true);

drop policy if exists "Authenticated operators can read waitlist" on public.waitlist_entries;
create policy "Authenticated operators can read waitlist"
on public.waitlist_entries for select
using (auth.role() = 'authenticated');
