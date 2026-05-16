# Production Migration Recovery

Use this when production has a partially-applied Supabase schema and later migrations fail with missing core relations such as `public.signals`.

## Safe Order

1. Apply `supabase/migrations/0019_rook_comment_production_auth_repair.sql`.
2. Confirm the core schema exists before running later comment/media migrations:

```sql
select * from public.signals limit 1;
select * from public.comments limit 1;
select * from public.profiles limit 1;
```

3. Confirm comment writes are permitted for authenticated users:

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('signals', 'comments', 'profiles', 'operators');
```

4. Redeploy Cloudflare Pages from `main`.
5. Test production with an authenticated user:
   - create or open a signal
   - post a top-level comment
   - post a reply
   - refresh `/signals/[id]`
   - confirm anonymous `/public/signals/[id]` still renders

## Why `0019` Is The Recovery Point

`0019_rook_comment_production_auth_repair.sql` is intentionally self-contained because production may have failed before the canonical `signals` table existed. It creates or repairs these core relations before adding comment foreign keys, triggers, RLS, and policies:

- `profiles`
- `flocks`
- `signals`
- `operators`
- `narratives`
- `briefs`
- `signal_likes`
- `signal_amplifies`
- `comments`

The migration is idempotent and uses `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, guarded foreign key creation, guarded indexes, repeatable triggers, and repeatable RLS policies.
