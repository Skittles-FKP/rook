create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
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
  created_at timestamptz not null default now(),
  constraint waitlist_status_check check (status in ('pending', 'invited', 'rejected'))
);

create table if not exists public.signal_reports (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid references public.signals(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint signal_reports_status_check check (status in ('open', 'reviewed', 'dismissed', 'actioned'))
);

create index if not exists waitlist_entries_created_at_idx on public.waitlist_entries(created_at desc);
create index if not exists signal_reports_status_idx on public.signal_reports(status, created_at desc);

alter table public.invite_codes enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.signal_reports enable row level security;

drop policy if exists "Invite codes are visible to everyone" on public.invite_codes;
create policy "Invite codes are visible to everyone"
on public.invite_codes for select
using (true);

drop policy if exists "Anyone can join waitlist" on public.waitlist_entries;
create policy "Anyone can join waitlist"
on public.waitlist_entries for insert
with check (true);

drop policy if exists "Authenticated users can report signals" on public.signal_reports;
create policy "Authenticated users can report signals"
on public.signal_reports for insert
with check (auth.uid() = reporter_id or reporter_id is null);

drop policy if exists "Signal reports visible to authenticated users" on public.signal_reports;
create policy "Signal reports visible to authenticated users"
on public.signal_reports for select
using (auth.role() = 'authenticated');
