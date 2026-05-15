create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

create table if not exists public.flocks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint flock_slug_format check (slug ~ '^[a-z0-9-]{3,40}$')
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  flock_id uuid references public.flocks(id) on delete set null,
  title text not null,
  body text not null,
  likes_count integer not null default 0,
  amplifies_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signal_title_length check (char_length(title) between 4 and 180),
  constraint signal_body_length check (char_length(body) between 1 and 2000)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.signals(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comment_body_length check (char_length(body) between 1 and 800)
);

create table if not exists public.signal_likes (
  signal_id uuid not null references public.signals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (signal_id, user_id)
);

create table if not exists public.signal_amplifies (
  signal_id uuid not null references public.signals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (signal_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create table if not exists public.flock_members (
  flock_id uuid not null references public.flocks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (flock_id, user_id),
  constraint flock_member_role check (role in ('owner', 'moderator', 'member'))
);

create index if not exists signals_created_at_idx on public.signals(created_at desc);
create index if not exists signals_author_id_idx on public.signals(author_id, created_at desc);
create index if not exists signals_flock_id_idx on public.signals(flock_id, created_at desc);
create index if not exists comments_signal_id_idx on public.comments(signal_id, created_at asc);
create index if not exists follows_following_id_idx on public.follows(following_id);
create index if not exists flock_members_user_id_idx on public.flock_members(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'rook'), '[^a-z0-9_]', '_', 'g'));
  base_username := substr(trim(both '_' from base_username), 1, 18);

  if char_length(base_username) < 3 then
    base_username := 'rook';
  end if;

  candidate_username := base_username;

  while exists (select 1 from public.profiles where username = candidate_username) loop
    candidate_username := substr(base_username, 1, 18) || '_' || substr(new.id::text, 1, 5);
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate_username,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', 'Rook Operator'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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

drop trigger if exists signal_likes_refresh_count_insert on public.signal_likes;
create trigger signal_likes_refresh_count_insert
after insert on public.signal_likes
for each row execute function public.refresh_signal_like_count();

drop trigger if exists signal_likes_refresh_count_delete on public.signal_likes;
create trigger signal_likes_refresh_count_delete
after delete on public.signal_likes
for each row execute function public.refresh_signal_like_count();

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

drop trigger if exists signal_amplifies_refresh_count_insert on public.signal_amplifies;
create trigger signal_amplifies_refresh_count_insert
after insert on public.signal_amplifies
for each row execute function public.refresh_signal_amplify_count();

drop trigger if exists signal_amplifies_refresh_count_delete on public.signal_amplifies;
create trigger signal_amplifies_refresh_count_delete
after delete on public.signal_amplifies
for each row execute function public.refresh_signal_amplify_count();

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

drop trigger if exists comments_refresh_count_insert on public.comments;
create trigger comments_refresh_count_insert
after insert on public.comments
for each row execute function public.refresh_signal_comment_count();

drop trigger if exists comments_refresh_count_delete on public.comments;
create trigger comments_refresh_count_delete
after delete on public.comments
for each row execute function public.refresh_signal_comment_count();

alter table public.profiles enable row level security;
alter table public.flocks enable row level security;
alter table public.signals enable row level security;
alter table public.comments enable row level security;
alter table public.signal_likes enable row level security;
alter table public.signal_amplifies enable row level security;
alter table public.follows enable row level security;
alter table public.flock_members enable row level security;

drop policy if exists "Profiles are visible to everyone" on public.profiles;
create policy "Profiles are visible to everyone"
on public.profiles for select
using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Flocks are visible to everyone" on public.flocks;
create policy "Flocks are visible to everyone"
on public.flocks for select
using (true);

drop policy if exists "Authenticated users can create flocks" on public.flocks;
create policy "Authenticated users can create flocks"
on public.flocks for insert
with check (auth.uid() = created_by);

drop policy if exists "Signals are visible to everyone" on public.signals;
create policy "Signals are visible to everyone"
on public.signals for select
using (true);

drop policy if exists "Authenticated users can create signals" on public.signals;
create policy "Authenticated users can create signals"
on public.signals for insert
with check (auth.uid() = author_id);

drop policy if exists "Authors can update own signals" on public.signals;
create policy "Authors can update own signals"
on public.signals for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Comments are visible to everyone" on public.comments;
create policy "Comments are visible to everyone"
on public.comments for select
using (true);

drop policy if exists "Authenticated users can comment" on public.comments;
create policy "Authenticated users can comment"
on public.comments for insert
with check (auth.uid() = author_id);

drop policy if exists "Likes are visible to everyone" on public.signal_likes;
create policy "Likes are visible to everyone"
on public.signal_likes for select
using (true);

drop policy if exists "Users manage own likes" on public.signal_likes;
create policy "Users manage own likes"
on public.signal_likes for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Amplifies are visible to everyone" on public.signal_amplifies;
create policy "Amplifies are visible to everyone"
on public.signal_amplifies for select
using (true);

drop policy if exists "Users manage own amplifies" on public.signal_amplifies;
create policy "Users manage own amplifies"
on public.signal_amplifies for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Follows are visible to everyone" on public.follows;
create policy "Follows are visible to everyone"
on public.follows for select
using (true);

drop policy if exists "Users manage own follows" on public.follows;
create policy "Users manage own follows"
on public.follows for all
using (auth.uid() = follower_id)
with check (auth.uid() = follower_id);

drop policy if exists "Flock members are visible to everyone" on public.flock_members;
create policy "Flock members are visible to everyone"
on public.flock_members for select
using (true);

drop policy if exists "Users manage own flock membership" on public.flock_members;
create policy "Users manage own flock membership"
on public.flock_members for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.signals;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
