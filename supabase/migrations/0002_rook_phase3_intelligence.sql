alter table public.profiles
  add column if not exists expertise_domains text[] not null default '{}',
  add column if not exists reputation_score integer not null default 0,
  add column if not exists signal_accuracy_score integer not null default 0,
  add column if not exists briefing_contribution_score integer not null default 0,
  add column if not exists pulse_influence_score integer not null default 0;

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
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint briefs_status_check check (status in ('pending', 'ready', 'failed'))
);

create index if not exists briefs_cluster_key_idx on public.briefs(cluster_key);
create index if not exists briefs_updated_at_idx on public.briefs(updated_at desc);

drop trigger if exists briefs_set_updated_at on public.briefs;
create trigger briefs_set_updated_at
before update on public.briefs
for each row execute function public.set_updated_at();

alter table public.briefs enable row level security;

drop policy if exists "Briefs are visible to everyone" on public.briefs;
create policy "Briefs are visible to everyone"
on public.briefs for select
using (true);

drop policy if exists "Authenticated users can create briefs" on public.briefs;
create policy "Authenticated users can create briefs"
on public.briefs for insert
with check (auth.uid() = generated_by);

drop policy if exists "Brief generators can update briefs" on public.briefs;
create policy "Brief generators can update briefs"
on public.briefs for update
using (auth.uid() = generated_by)
with check (auth.uid() = generated_by);

do $$
begin
  alter publication supabase_realtime add table public.briefs;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
