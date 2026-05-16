-- Production repair for Cloudflare/Supabase comment and reply persistence.
-- Safe to run repeatedly against environments that may have missed earlier repair migrations.

create extension if not exists pgcrypto;

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
    foreign key (signal_id) references public.signals(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.comments
    add constraint comments_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.comments
    add constraint comments_parent_comment_id_fkey
    foreign key (parent_comment_id) references public.comments(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

create index if not exists comments_signal_id_created_at_idx
  on public.comments(signal_id, created_at asc);

create index if not exists comments_parent_comment_id_created_at_idx
  on public.comments(parent_comment_id, created_at asc);

alter table public.comments enable row level security;
alter table public.profiles enable row level security;
alter table public.signals enable row level security;
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
