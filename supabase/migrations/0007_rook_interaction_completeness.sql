alter table public.comments
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;

create index if not exists comments_parent_comment_id_idx
  on public.comments(parent_comment_id, created_at asc);

create index if not exists operator_alerts_user_read_idx
  on public.operator_alerts(user_id, read_at, created_at desc);

create index if not exists signal_likes_created_at_idx
  on public.signal_likes(created_at desc);

create index if not exists signal_amplifies_created_at_idx
  on public.signal_amplifies(created_at desc);

create index if not exists follows_created_at_idx
  on public.follows(created_at desc);
