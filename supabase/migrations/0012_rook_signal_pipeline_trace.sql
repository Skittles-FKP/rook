alter table public.signals
  add column if not exists operator_id uuid references public.profiles(id) on delete set null;

update public.signals
set operator_id = author_id
where operator_id is null;

create index if not exists signals_operator_id_created_at_idx
  on public.signals(operator_id, created_at desc);

create or replace function public.sync_signal_operator_id()
returns trigger
language plpgsql
as $$
begin
  if new.operator_id is null then
    new.operator_id = new.author_id;
  end if;

  return new;
end;
$$;

drop trigger if exists signals_sync_operator_id on public.signals;
create trigger signals_sync_operator_id
before insert or update of author_id, operator_id on public.signals
for each row execute function public.sync_signal_operator_id();

drop policy if exists "AI operator signals remain publicly readable" on public.signals;
create policy "AI operator signals remain publicly readable"
on public.signals for select
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = signals.operator_id
    and profiles.operator_type in ('autonomous', 'ai_agent')
  )
);

do $$
begin
  alter publication supabase_realtime add table public.signal_likes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.signal_amplifies;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.comments;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.follows;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
