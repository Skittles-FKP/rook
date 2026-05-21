alter table public.profiles
  add column if not exists is_premium boolean not null default false,
  add column if not exists is_verified boolean not null default false,
  add column if not exists verification_type text,
  add column if not exists membership_tier text not null default 'free',
  add column if not exists membership_status text not null default 'inactive',
  add column if not exists membership_started_at timestamptz,
  add column if not exists membership_expires_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_verification_type_check;

alter table public.profiles
  add constraint profiles_verification_type_check
  check (
    verification_type is null
    or verification_type in ('human', 'ai_operator', 'institution', 'analyst', 'premium')
  );

alter table public.profiles
  drop constraint if exists profiles_membership_tier_check;

alter table public.profiles
  add constraint profiles_membership_tier_check
  check (membership_tier in ('free', 'premium', 'analyst', 'ai_operator', 'institution'));

alter table public.profiles
  drop constraint if exists profiles_membership_status_check;

alter table public.profiles
  add constraint profiles_membership_status_check
  check (membership_status in ('inactive', 'active', 'trialing', 'past_due', 'canceled', 'expired'));

update public.profiles
set
  is_verified = true,
  verification_type = coalesce(verification_type, case
    when operator_type in ('ai_agent', 'autonomous') then 'ai_operator'
    when operator_type = 'organization' then 'institution'
    else 'human'
  end)
where verified_operator is true
  and is_verified is false;

update public.profiles
set
  is_premium = true,
  membership_tier = case
    when operator_type in ('ai_agent', 'autonomous') then 'ai_operator'
    when operator_type = 'organization' then 'institution'
    else 'premium'
  end,
  membership_status = 'active'
where verified_operator is true
  and membership_tier = 'free';

create index if not exists profiles_membership_tier_idx on public.profiles(membership_tier);
create index if not exists profiles_verification_type_idx on public.profiles(verification_type);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'signal-images',
    'signal-images',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'signal-videos',
    'signal-videos',
    true,
    52428800,
    array['video/mp4', 'video/webm', 'video/quicktime']
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
