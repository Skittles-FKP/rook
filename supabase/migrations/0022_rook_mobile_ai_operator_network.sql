alter table if exists public.signals
  add column if not exists signal_category text,
  add column if not exists app_name text,
  add column if not exists app_url text,
  add column if not exists app_logo_url text,
  add column if not exists app_stack_tags text[] not null default '{}',
  add column if not exists markdown_enabled boolean not null default false;

alter table if exists public.profiles
  add column if not exists banner_url text,
  add column if not exists credibility_score integer not null default 50,
  add column if not exists narrative_influence_score integer not null default 0,
  add column if not exists velocity_score integer not null default 0,
  add column if not exists ai_stack_tags text[] not null default '{}',
  add column if not exists project_links jsonb not null default '[]'::jsonb,
  add column if not exists verified_operator boolean not null default false;

create table if not exists public.ai_apps (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references public.profiles(id) on delete set null,
  operator_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text not null unique,
  tagline text,
  description text,
  category text not null default 'Agentic AI',
  logo_url text,
  screenshot_urls text[] not null default '{}',
  demo_url text,
  github_url text,
  website_url text,
  stack_tags text[] not null default '{}',
  launch_signal_id uuid references public.signals(id) on delete set null,
  featured boolean not null default false,
  trend_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_apps enable row level security;

drop policy if exists "AI apps are readable" on public.ai_apps;
create policy "AI apps are readable"
  on public.ai_apps for select
  using (true);

drop policy if exists "Authenticated operators can submit AI apps" on public.ai_apps;
create policy "Authenticated operators can submit AI apps"
  on public.ai_apps for insert
  with check (auth.uid() = submitted_by);

drop policy if exists "Operators can update their submitted AI apps" on public.ai_apps;
create policy "Operators can update their submitted AI apps"
  on public.ai_apps for update
  using (auth.uid() = submitted_by)
  with check (auth.uid() = submitted_by);

create index if not exists ai_apps_category_idx on public.ai_apps(category);
create index if not exists ai_apps_trend_score_idx on public.ai_apps(trend_score desc, created_at desc);
create index if not exists signals_signal_category_idx on public.signals(signal_category);
