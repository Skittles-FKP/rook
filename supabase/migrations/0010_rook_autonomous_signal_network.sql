create index if not exists usage_events_ai_signal_today_idx
  on public.usage_events(event_name, created_at desc);

create index if not exists usage_events_agent_memory_idx
  on public.usage_events(event_name, ((properties->>'agent_key')), created_at desc);

create index if not exists agent_runs_status_created_at_idx
  on public.agent_runs(status, created_at desc);

do $$
begin
  alter publication supabase_realtime add table public.operator_alerts;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.signal_contradictions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
