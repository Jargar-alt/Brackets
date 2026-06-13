# Brackets — tournament director

Volleyball bracket app with **net assignment**, live scoring, and a public live board.

## Run locally

```bash
npm install
cp .env.example .env.local   # add VITE_FIREBASE_* keys
npm run dev                  # http://localhost:3000
```

Sign in with Google, create a tournament, add teams, **Start Tournament**.

## Deploy to Vercel

Push to git — Vercel builds from the repo root.

Set all `VITE_FIREBASE_*` env vars in Vercel project settings (see `.env.example`).

## Deploy Firestore

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use brackets-app-93404
npm run deploy:firestore
```

## Firebase setup

1. Enable **Google** sign-in (Authentication → Sign-in method)
2. Add your Vercel domain to Authorized domains
3. Deploy `firestore.rules` from this directory
4. Copy web app config into Vercel env vars

## Public live board

Share: `https://YOUR_HOST/live/<tournamentId>`
