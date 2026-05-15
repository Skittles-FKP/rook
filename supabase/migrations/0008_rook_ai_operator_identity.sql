alter table public.profiles
  add column if not exists operator_type text not null default 'human',
  add column if not exists autonomous_status text,
  add column if not exists source_domains_monitored text[] not null default '{}',
  add column if not exists signal_frequency text;

alter table public.profiles
  drop constraint if exists profiles_operator_type_check;

alter table public.profiles
  add constraint profiles_operator_type_check
  check (operator_type in ('human', 'ai_agent', 'organization'));

create index if not exists profiles_operator_type_idx
  on public.profiles(operator_type);
