alter table public.comments
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;

create index if not exists comments_parent_comment_id_idx
  on public.comments(parent_comment_id, created_at asc);

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

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
    and user_id = auth.uid()
  );
$$;

drop policy if exists "members can read their organizations" on public.organizations;
create policy "members can read their organizations"
  on public.organizations for select
  using (
    created_by = auth.uid()
    or public.is_organization_member(id)
  );

drop policy if exists "members can read org membership" on public.organization_members;
create policy "members can read org membership"
  on public.organization_members for select
  using (
    user_id = auth.uid()
    or public.is_organization_member(organization_id)
  );

drop policy if exists "members can read workspace signals" on public.workspace_signals;
create policy "members can read workspace signals"
  on public.workspace_signals for select
  using (public.is_organization_member(organization_id));
