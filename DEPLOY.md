# Deploy Lnq

## Vercel (production)

1. Import `r3s0lv343vr/lnq` in the Vercel dashboard.
2. Set `NEXT_PUBLIC_FIREBASE_*` from `.env.example`.
3. Deploy. Optional: `LNQ_WEBHOOK_SECRET`, `FORTH_PRODUCTION_URL`.
4. Publish Firestore rules: `firebase deploy --only firestore`.

## Demo without Firebase

Open the site and click **Explore demo** (`demo@lnq.test` / `demo123`).

Production: https://lnq-eight.vercel.app

## Hult submission PR

```bash
bash scripts/open-hult-pr.sh
```

Requires push access to `r3s0lv343vr/hult-cohort-program`.
