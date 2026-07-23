# [Project 2] Submission — r3s0lv343vr

**Lnq** — Zulip-class async-first cohort communication.

## Production URL

- **Build repo:** https://github.com/r3s0lv343vr/lnq (`main`)
- **Vercel target:** import `r3s0lv343vr/lnq` → set `NEXT_PUBLIC_FIREBASE_*` from `.env.example` → deploy (intended production host `lnq.vercel.app` / project alias)
- **Live smoke (agent session tunnel):** https://handed-theories-wolf-bull.trycloudflare.com — `GET /api/health` → `{"ok":true,"app":"lnq"}`
- **Product PR:** https://github.com/r3s0lv343vr/lnq/pull/1
- **Formal Hult PR helper:** `bash scripts/open-hult-pr.sh` (needs push access to the participant fork)

Health: `GET /api/health` → `{"ok":true,"app":"lnq"}`

## Product summary

Lnq organizes cohort conversation the way Zulip does: **streams** (channels) plus **topics** inside each stream, so async traffic stays scannable during review weeks and deadlines. Direct messages, admin-only announcements, @mention notifications, keyword search, and message persistence cover the Project 2 baseline. The differentiator is topic-first organization plus a designed Forth integration surface (email identity match, deep-link unfurls, webhook contract).

## Baseline coverage

| Requirement | Implementation |
|-------------|----------------|
| Channels (≥3 public; create/rename/archive) | Seeded `general`, `announcements`, `reviews`, `setup`; admin create/rename/archive |
| Direct messages | 1:1 DMs keyed by normalized email pair |
| Message persistence | Firestore when configured; `localStorage` demo mode otherwise (≥30-day capable) |
| Announcements | `announcements` stream — only `admin` / `operator` may post |
| Notifications | In-app on @mention and DM |
| Search | Keyword search across visible stream + DM messages |
| Multi-user auth | Firebase Auth (email/password, Google, GitHub) + demo accounts; identity key = email |
| Deployment | Vercel (Next.js 15) |

## Forth integration (PM platform)

Production PM: [https://forth-bice.vercel.app](https://forth-bice.vercel.app)

- **Email identity match** — Lnq normalizes emails the same way Forth invitations do; signup copy asks for the Forth account email (Google/GitHub).
- **Production URL link** — header deep-link into Forth.
- **Designed APIs** (implemented on Lnq):
  - `GET /api/integrations/forth/identity?email=`
  - `POST /api/integrations/forth/unfurl`
  - `POST /api/integrations/forth/webhook`
  - `GET /api/integrations/forth/link`
- Paste a Forth URL in a message → compact unfurl embed.
- Details: [`docs/INTEGRATION.md`](https://github.com/r3s0lv343vr/lnq/blob/main/docs/INTEGRATION.md)

## Architecture

Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS 4 · Firebase Auth + Firestore (optional) · Vitest.

```text
Landing / Auth boundary
        ├── Explore demo → localStorage demo store
        └── Firebase Auth → Firestore realtime (onSnapshot)
                    │
                    ▼
Zulip-style shell: streams → topics → messages + DMs / search / notifications
                    │
                    └── Forth integration APIs + deep links
```

Demo login (admin): `demo@lnq.local` / `demo123`

## Setup (fresh clone)

```bash
git clone https://github.com/r3s0lv343vr/lnq.git && cd lnq
npm install
cp .env.example .env.local   # optional for demo mode
npm run dev                  # http://localhost:3000
```

Production: set `NEXT_PUBLIC_FIREBASE_*`, deploy Firestore rules (`firebase deploy --only firestore`), import the GitHub repo on Vercel.

## Validation

- `npm run typecheck`
- `npm run test` (15 unit tests)
- `npm run lint`
- `npm run build`

## Known limitations

- Without Firebase env vars the app runs in browser-local demo mode (multi-tab OK; not cross-device).
- Forth does not yet expose a public task REST API; Lnq’s webhook/unfurl contract is ready for Phase unification.
- Notifications are in-app only (email delivery not shipped).
- Realtime uses Firestore `onSnapshot` when configured; demo mode polls listeners locally.

## Agent usage

Built with Cursor cloud agents: scaffolded Next.js + Firebase dual-mode store, Zulip-style UI, Forth integration APIs, tests, and submission packaging against `projects/summer26/phase-1-project-2`.

*I'd like to present.*
