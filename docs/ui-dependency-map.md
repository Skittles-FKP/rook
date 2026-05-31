# Rook UI Dependency Map

## App Shell

- `src/app/layout.tsx` defines global metadata and loads `src/app/globals.css`.
- `src/app/(app)/layout.tsx` fetches profile and network events, then renders `AppShell`.
- `src/components/shell/app-shell.tsx` owns desktop sidebar, mobile header, mobile bottom nav, operator drawer, tablet/right rail, install prompt, realtime profile refresh, and route swipe handling.
- `src/lib/navigation.ts` supplies app navigation and mobile tab definitions.

## Design System

- `src/app/globals.css` contains global tokens, base layout rules, surface utilities, mobile feed utilities, motion, graph/radar animation, and reduced-motion handling.
- `tailwind.config.ts` maps the `rook.*` color, shadow, background, and animation tokens used throughout pages and components.
- `src/components/brand.tsx` renders the Rook mark and raven icon.
- `src/components/button.tsx` defines shared link button styling.

## Feed

- `src/app/(app)/feed/page.tsx` fetches Signals/Flocks/escalations, ranks feed items, renders `MobileSignalFeed` for mobile and `SignalCard` for desktop.
- `src/components/signals/mobile-signal-feed.tsx` owns mobile live insertions, incremental rendering window, pull refresh, compose modal, gesture actions, mobile card layout, lazy media, brief mode, and optimistic local save state.
- `src/components/signal-card.tsx` owns desktop and brief signal cards, badges, media, evidence, intelligence panels, engagement, and share actions.
- `src/components/signals/signal-media.tsx`, `signal-actions.tsx`, `share-signal-button.tsx`, `signal-composer.tsx`, `signal-evidence-section.tsx`, and `signal-intelligence-panel.tsx` provide nested feed functionality.

## Core Pages

- `src/app/(app)/pulse/page.tsx` renders Pulse ticker, time filters, radar, clusters, anomalies, and Signal media.
- `src/app/(app)/graph/page.tsx` renders graph stats, `IntelligenceGraph`, `PulseRadar`, narrative cards, evidence cards, and live room presence.
- `src/app/(app)/rooms/page.tsx` renders collaborative room cards backed by graph data.
- `src/app/(app)/profile/page.tsx` delegates to `ProfileView`.
- `src/app/(app)/ops/page.tsx` renders production, AI queue, debug, observability, analytics, and entitlement panels.
- `src/app/(app)/search/page.tsx` renders semantic search, retrieval readiness, and results.
- `src/app/page.tsx` renders the landing hero, product sections, graph/radar demo, and public CTAs.

## Shared Visual Components

- `src/components/pulse/pulse-radar.tsx` draws radar SVG and cluster metrics.
- `src/components/graph/intelligence-graph.tsx` draws the intelligence graph.
- `src/components/graph/live-room-presence.tsx` renders room presence.
- `src/components/profile/profile-view.tsx` renders profile identity and activity.
- `src/components/shell/page-header.tsx` renders route headers.
