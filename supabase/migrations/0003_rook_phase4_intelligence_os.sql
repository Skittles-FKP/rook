alter table public.signals
  add column if not exists image_url text,
  add column if not exists reference_url text,
  add column if not exists chart_url text,
  add column if not exists embed_url text,
  add column if not exists confidence_score integer,
  add column if not exists ai_narrative_tags text[] not null default '{}',
  add column if not exists contradiction_score integer,
  add column if not exists sentiment_overlay text;

create table if not exists public.intelligence_rooms (
  id uuid primary key default gen_random_uuid(),
  flock_id uuid references public.flocks(id) on delete cascade,
  name text not null,
  objective text,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intelligence_rooms_status_check check (status in ('active', 'quiet', 'archived'))
);

create table if not exists public.room_brief_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.intelligence_rooms(id) on delete cascade,
  brief_id uuid references public.briefs(id) on delete set null,
  operator_id uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists intelligence_rooms_flock_id_idx on public.intelligence_rooms(flock_id);
create index if not exists room_brief_sessions_room_id_idx on public.room_brief_sessions(room_id, created_at desc);

drop trigger if exists intelligence_rooms_set_updated_at on public.intelligence_rooms;
create trigger intelligence_rooms_set_updated_at
before update on public.intelligence_rooms
for each row execute function public.set_updated_at();

alter table public.intelligence_rooms enable row level security;
alter table public.room_brief_sessions enable row level security;

drop policy if exists "Rooms are visible to everyone" on public.intelligence_rooms;
create policy "Rooms are visible to everyone"
on public.intelligence_rooms for select
using (true);

drop policy if exists "Authenticated users can create rooms" on public.intelligence_rooms;
create policy "Authenticated users can create rooms"
on public.intelligence_rooms for insert
with check (auth.uid() = created_by);

drop policy if exists "Room sessions are visible to everyone" on public.room_brief_sessions;
create policy "Room sessions are visible to everyone"
on public.room_brief_sessions for select
using (true);

drop policy if exists "Authenticated users can create room sessions" on public.room_brief_sessions;
create policy "Authenticated users can create room sessions"
on public.room_brief_sessions for insert
with check (auth.uid() = operator_id);

do $$
begin
  alter publication supabase_realtime add table public.intelligence_rooms;
  alter publication supabase_realtime add table public.room_brief_sessions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
