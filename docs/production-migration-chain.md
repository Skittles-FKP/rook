# Rook Production Migration Chain

Production reported `public.signals` missing before `0017_rook_signal_media_network.sql`. Apply the chain below in order. The new `0015z` foundation repair is intentionally idempotent and can run on an empty or partially migrated database.

## Ordered Core Chain

```text
0001_rook_phase2_schema.sql
0002_rook_phase3_intelligence.sql
0003_rook_phase4_intelligence_os.sql
0004_rook_phase6_launch.sql
0005_rook_phase7_8_narrative_agents.sql
0006_rook_phase9_10_11_enterprise.sql
0007_rook_interaction_completeness.sql
0008_rook_ai_operator_identity.sql
0009_rook_operator_avatars.sql
0010_rook_autonomous_signal_network.sql
0011_rook_pulse_narrative_schema_repair.sql
0012_rook_signal_pipeline_trace.sql
0013_rook_autonomous_operator_bootstrap.sql
0014_rook_autonomous_system_profiles.sql
0015_rook_canonical_schema_stabilization.sql
0015z_rook_production_foundation_repair.sql
0016_rook_auth_email_onboarding_network.sql
0017_rook_signal_media_network.sql
```

## Why `0015z` Exists

`0015_rook_canonical_schema_stabilization.sql` already creates the canonical Rook schema, but production can be partially migrated. `0015z_rook_production_foundation_repair.sql` repairs the foundation immediately before auth and media migrations run.

It creates or repairs:

```text
profiles
signals
comments
signal_likes
signal_amplifies
flocks
flock_members
follows
briefs
narratives
graph_edges
signal_contradictions
signal_pulse_metadata
pulse_events
pulse_clusters
intelligence_rooms
room_brief_sessions
narrative_subscriptions
operator_alert_preferences
operator_alerts
agent_runs
organizations
organization_members
workspaces
workspace_signals
ai_queue_jobs
external_sources
external_signal_ingest
signal_embeddings
usage_events
operator_entitlements
operator_profile_extensions
operators
invite_codes
waitlist_entries
signal_reports
```

## Storage Buckets

The chain ensures these public feed media buckets exist:

```text
rook-media
signal-images
signal-videos
```

Policies enforce:

```text
public read for feed media
authenticated upload only
object path ownership via first folder segment = auth.uid()
owner-only update/delete
```

## Media Support

The final schema supports:

```text
media_type
media_url
thumbnail_url
embed_url
og_title
og_description
og_image
media_metadata
ai_narrative_tags
confidence_score
contradiction_score
sentiment_overlay
```

## Deployment

1. Apply migrations through Supabase CLI or Dashboard SQL editor in the order above.
2. If production already marked older migrations as applied, run `0015z_rook_production_foundation_repair.sql`, then `0016_rook_auth_email_onboarding_network.sql`, then `0017_rook_signal_media_network.sql`.
3. Deploy Cloudflare Pages after the database is migrated.
4. Confirm `/feed` loads and `/admin/email-health` reports Supabase/Auth status.

The application code remains Cloudflare Edge Runtime compatible. Migrations are database-side SQL only; app media handling uses browser `File`, `fetch`, and Supabase fetch clients.
