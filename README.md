# Lnq

**Lnq** is async-first cohort communication — Zulip-class streams, topics, and direct messages built for program teams. Pair it with [Forth](https://forth-bice.vercel.app) for project management; identity aligns via email.

## Product pitch

Cohort programs need clarity without the noise of real-time chat. Lnq organizes conversations into **streams** (channels) and **topics** (threads within a stream), so async discussions stay scannable. Announcements are restricted to admins and operators. Direct messages, @mentions, keyword search, and in-app notifications keep everyone in the loop — without the pressure of always-on Slack.

**Design**: editorial terminal aesthetic — deep ink, phosphor teal, warm paper. Signal clarity over decoration.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — see below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) locally, or use production: [https://lnq-eight.vercel.app](https://lnq-eight.vercel.app).

### Demo mode (no Firebase)

Click **Explore demo** on the landing page. Data persists in `localStorage` across refreshes. Default login: `demo@lnq.test` / `demo123` (admin role).

### Production mode (Firebase)

Set these in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Deploy Firestore rules and indexes:

```bash
firebase deploy --only firestore
```

Sign up with email/password or Google/GitHub OAuth. Use the **same email** as your Forth account.

## Forth integration

- Header link opens Forth production
- Paste Forth URLs in messages → compact link unfurls
- Webhook endpoint for task lifecycle events (see `docs/INTEGRATION.md`)
- Identity match: normalized email across both platforms

```env
FORTH_PRODUCTION_URL=https://forth-bice.vercel.app
LNQ_WEBHOOK_SECRET=          # optional bearer for webhook auth
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Vitest unit tests |
| `npm run lint` | ESLint |

## Deploy

See [DEPLOY.md](./DEPLOY.md) for Vercel + Firebase production and the Hult PR helper.

## Stack

- Next.js 15 · React 19 · TypeScript
- Tailwind CSS 4
- Firebase Auth + Firestore (optional)
- Zustand-free — custom demo store + Firestore subscriptions
- Vitest + Testing Library

## Project structure

See [AGENTS.md](./AGENTS.md) for the full agent contract and architecture map.

## License

Private — cohort internal use.

