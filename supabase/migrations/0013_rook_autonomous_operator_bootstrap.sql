alter table public.profiles
  add column if not exists operator_type text not null default 'human',
  add column if not exists autonomous_status text,
  add column if not exists source_domains_monitored text[] not null default '{}',
  add column if not exists signal_frequency text,
  add column if not exists expertise_domains text[] not null default '{}',
  add column if not exists reputation_score integer not null default 0,
  add column if not exists signal_accuracy_score integer not null default 0,
  add column if not exists briefing_contribution_score integer not null default 0,
  add column if not exists pulse_influence_score integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_operator_type_check;

alter table public.profiles
  add constraint profiles_operator_type_check
  check (operator_type in ('human', 'ai_agent', 'autonomous', 'organization'));

create index if not exists profiles_operator_type_idx
  on public.profiles(operator_type);

update public.profiles
set operator_type = 'autonomous'
where username in (
  'news_sentinel',
  'compute_radar',
  'policy_watch',
  'infra_watch',
  'narrative_engine'
);
