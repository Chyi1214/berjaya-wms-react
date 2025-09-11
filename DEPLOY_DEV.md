# Developer Deployment Options

This app is a Vite + React SPA deployed via Firebase Hosting. Below are two solid ways to stand up a developer server without touching production.

## Option A — Preview Channel (quickest)

Creates a temporary or long‑lived URL on your existing Hosting site. No new site needed.

Prereqs:
- Firebase CLI installed: `npm i -g firebase-tools`
- Logged in: `firebase login`

Steps:
1) Build the app
   - `cd berjaya-wms-react`
   - `npm run build`

2) Deploy to a preview channel (7‑day URL)
   - `npm run deploy:preview`
   - The CLI prints a unique preview URL (e.g. https://<site>--dev-xxxxx.web.app)

Notes:
- Preview channels are isolated Hosting versions, great for testing without changing live.
- Use `--expires <ttl>` to control lifetime. Example: `--expires 30d` for a month.

## Option B — Dedicated Dev Site (permanent dev URL)

Creates a separate Firebase Hosting site (and optionally a separate Firebase project) for development.

Prereqs:
- Firebase CLI: `npm i -g firebase-tools`
- Logged in: `firebase login`
- Decide whether to reuse the same Firebase project (Firestore/Auth) or create a separate dev project.

### 1) Create a Hosting site for dev

In the same Firebase project as production (safe and common):
- `firebase hosting:sites:create <your-dev-site-id>`

Example: `firebase hosting:sites:create berjaya-autotech-dev`

### 2) Map a Hosting target (non-breaking)

Keep production as-is and add a new dev target mapping:
- `firebase target:apply hosting dev <your-dev-site-id>`

This writes a mapping into `.firebaserc` without changing current prod config.

### 3) Deploy to dev target

Build and deploy:
- `npm run build`
- `firebase deploy --only hosting:dev`

This uploads the `dist/` bundle to your dev site.

### 4) Environment variables (recommended)

If you use a separate Firebase project for dev (recommended), create a dev env file:
- Copy `.env.example` to `.env.dev`
- Fill it with your dev project’s credentials (all `VITE_...` keys)

Build using the dev mode so Vite picks `.env.dev`:
- `npm run build:dev`
- Then deploy: `firebase deploy --only hosting:dev`

Vite mode reference:
- `.env`            → default
- `.env.development` for `npm run dev`
- `.env.<mode>` for `vite build --mode <mode>` (we use `dev`)

## Local Dev (for completeness)

- `npm run dev` → Vite dev server at http://localhost:3000
- Ensure `.env` contains valid Firebase credentials or app will fail to init.

## Troubleshooting

- Missing Firebase env: run `node check-config.js` for a quick sanity check.
- Permission denied camera on iOS: ensure the site URL uses HTTPS and the domain is granted camera permission in Safari/Chrome.
- Hosting deploy 403/permissions: confirm Firebase CLI login and project access (`firebase projects:list`).

