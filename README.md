# Rook

Rook is an AI-native social intelligence platform. Phase 1 establishes the brand system, landing page, responsive app shell, and routed preview surfaces for Feed, Pulse, Flocks, Briefs, Profile, and Settings.

## Current Phase

Phase 2:

- Next.js App Router
- React
- Tailwind CSS
- Premium dark Rook visual system
- Supabase email/password auth with SSR session persistence
- Protected app routes with middleware
- Profile onboarding and signup profile creation
- Supabase Postgres schema and RLS policies
- Live Signal feed, composer, likes, amplifies, comments, follows, and Flocks

AI Brief generation is intentionally still a later phase. The Briefs page does not fake AI output.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Apply the database migration in Supabase SQL Editor or with the Supabase CLI:

```bash
supabase db push
```

## Checks

```bash
npm run lint
npm run build
```

## Structure

```text
src/app
  page.tsx              Landing page
  (app)/layout.tsx      App shell wrapper
  (app)/*/page.tsx      Protected product surfaces
  actions/*             Server actions for auth and data writes
src/components
  brand.tsx             Rook mark
  button.tsx            Shared link button
  signal-card.tsx       Database-backed Signal card
  shell/*               Navigation, page headers, phase panels
  auth/*                Auth and onboarding forms
  signals/*             Composer, actions, realtime, comments
  flocks/*              Flock create/join controls
  profile/*             Profile and follow controls
src/lib
  navigation.ts         Navigation and product language
  supabase/*            SSR/browser/middleware Supabase clients
  data/*                Server-side read models
supabase/migrations     Database schema and RLS
```
