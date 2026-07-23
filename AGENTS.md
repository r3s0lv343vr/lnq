# Lnq — Agent Contract

Lnq is an async-first cohort communication app (Zulip-class streams, topics, DMs) with Forth PM integration.

## Stack

- **Next.js 15** (App Router, Turbopack)
- **React 19**, TypeScript strict
- **Tailwind CSS 4** — design tokens in `src/app/globals.css`
- **Firebase** (optional) — Auth + Firestore; falls back to localStorage demo mode
- **Vitest** — unit tests in `src/lib/**/*.test.ts`

## Architecture

```
src/
  app/           # pages + API routes
  components/    # UI (landing, auth, Zulip-style shell)
  lib/
    types.ts     # domain types
    identity.ts  # email normalization, mentions, Forth URLs
    seed.ts      # default streams + welcome messages
    firebase/    # Firebase init (hasFirebaseConfig gate)
    store/
      demo-store.ts      # localStorage-backed store
      firebase-store.ts  # Firestore-backed store
    forth/       # Forth integration contract + client
    session.tsx  # auth context + unified store API
```

## Auth modes

| Mode | Trigger | Persistence |
|------|---------|-------------|
| **demo** | "Explore demo" or email/password without Firebase env | `localStorage` (`lnq-demo-v1`) |
| **firebase** | Firebase env vars set + sign-in/OAuth | Firestore |

Session provider (`useSession`) abstracts both modes. Components never import stores directly.

## Design system

- **Colors**: ink `#0B1F24`, teal `#1FA6A0`, paper `#F3EFE6`, charcoal text
- **Fonts**: Fraunces (display), Source Serif 4 (body), IBM Plex Mono (meta) via `next/font`
- **Layout**: Zulip 3-column — stream rail | topic list | message pane
- **Motion**: 2–3 CSS transitions; respect `prefers-reduced-motion`

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/integrations/forth/identity` | GET | Email identity hint for Forth alignment |
| `/api/integrations/forth/unfurl` | POST | Forth URL link preview |
| `/api/integrations/forth/webhook` | POST | Forth lifecycle events (optional bearer) |
| `/api/integrations/forth/link` | GET | Integration metadata |

## Firestore collections

- `profiles/{uid}` — user profile (self-write)
- `streams/{id}` + `streams/{id}/messages/{id}`
- `dms/{id}` + `dms/{id}/messages/{id}`
- `notifications/{uid}/items/{id}`

Rules in `firestore.rules`. Indexes in `firestore.indexes.json`.

## Conventions

1. Import paths use `@/` alias.
2. Client components use `'use client'`.
3. Do not add `useMemo`/`useCallback` unless necessary.
4. Keep lib layer free of UI imports.
5. Run `npm run typecheck && npm run test && npm run build` before committing.

## Forth integration

- Production URL: `https://forth-bice.vercel.app`
- Identity key: normalized email (must match Google/GitHub OAuth email)
- Paste Forth URLs in messages → unfurl via `/api/integrations/forth/unfurl`
- See `docs/INTEGRATION.md` for full contract

## Seeded streams

`general`, `announcements` (admin/operator only), `reviews`, `setup` — see `src/lib/seed.ts`.
