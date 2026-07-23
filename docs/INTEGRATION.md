# Lnq ↔ Forth Integration

This document describes how Lnq and [Forth](https://forth-bice.vercel.app) align on identity and designed API contracts.

## Identity matching

Both platforms use **normalized email** as the identity key:

```
normalize(email) = email.trim().toLowerCase()
```

Users should sign into Lnq with the **same Google or GitHub email** they use on Forth. OAuth providers must return a verified email that matches.

### Lnq identity endpoint

```
GET /api/integrations/forth/identity?email=user@example.com
```

**Response:**

```json
{
  "email": "user@example.com",
  "normalized": "user@example.com",
  "matchedHint": "Use the same Google/GitHub email as Forth (forth-bice.vercel.app)"
}
```

Forth (or a linking UI) can call this to confirm the email format Lnq expects before suggesting account linking.

## Link metadata

```
GET /api/integrations/forth/link
```

**Response:**

```json
{
  "forth": "https://forth-bice.vercel.app",
  "identity": "email",
  "apis": {
    "identity": "GET /api/integrations/forth/identity?email=",
    "unfurl": "POST /api/integrations/forth/unfurl",
    "webhook": "POST /api/integrations/forth/webhook",
    "link": "GET /api/integrations/forth/link"
  }
}
```

## Link unfurling

When a user pastes a Forth URL in an Lnq message, the client calls:

```
POST /api/integrations/forth/unfurl
Content-Type: application/json

{ "url": "https://forth-bice.vercel.app/task/abc" }
```

**Response:**

```json
{
  "url": "https://forth-bice.vercel.app/task/abc",
  "title": "Forth",
  "subtitle": "Forth task",
  "status": "optional-status"
}
```

Lnq attempts Forth's `/api/og` endpoint first, then falls back to path-based titles. See `src/lib/forth/client.ts`.

## Webhook events (Forth → Lnq)

Forth can POST lifecycle events to Lnq:

```
POST /api/integrations/forth/webhook
Authorization: Bearer <LNQ_WEBHOOK_SECRET>   # optional, if configured
Content-Type: application/json

{
  "type": "task.assigned",
  "email": "user@example.com",
  "taskTitle": "Ship cohort comms",
  "taskUrl": "https://forth-bice.vercel.app/task/abc",
  "workspaceName": "Cohort 7",
  "occurredAt": "2026-07-23T12:00:00.000Z"
}
```

**Event types:**

| Type | Suggested Lnq channel |
|------|----------------------|
| `task.assigned` | `#reviews` |
| `task.landed` | `#reviews` |
| `task.paused` | `#general` |
| `member.invited` | `#general` |

**Response:**

```json
{
  "accepted": true,
  "channelHint": "#reviews",
  "messagePreview": "Forth: user@example.com was assigned to \"Ship cohort comms\"",
  "note": "Persistence is best-effort — wire to Firestore admin SDK in production."
}
```

Persistence to Lnq streams/notifications is designed but not fully wired in v0.1 — the webhook acknowledges and returns routing hints.

## Environment variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `FORTH_PRODUCTION_URL` | Server | Forth base URL (default: `https://forth-bice.vercel.app`) |
| `LNQ_WEBHOOK_SECRET` | Server | Optional bearer token for webhook auth |
| `NEXT_PUBLIC_LNQ_URL` | Public | Lnq public URL for unfurl proxy (optional) |

## Client usage in Lnq

- Header **Forth ↗** link opens production Forth
- Auth panel explains email alignment requirement
- `unfurlForthUrl()` in `src/lib/forth/client.ts` powers message embeds

## Future work

- [ ] Persist webhook events to `#reviews` / `#general` via Admin SDK
- [ ] Bidirectional identity linking (Forth user ID ↔ Lnq profile)
- [ ] Rich task cards with live status from Forth API
