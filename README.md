# AmritaCare

This repository contains the AmritaCare web app (frontend in `public/` and server API in `api/`). It is prepared for deployment on Vercel.

Quick notes for production deployment

- Environment variables: set the secrets listed in `.env` as Vercel project environment variables (production). Do NOT commit `.env` to git.
- For Firebase Admin persistence, set `FIREBASE_SERVICE_ACCOUNT_BASE64` to a base64-encoded service account JSON.
- Keep server-only secrets under non-`VITE_` env names (e.g., `CLOUDINARY_API_SECRET`, `SENDGRID_API_KEY`).
- Static assets are served from `public/`. Large media should be hosted on Cloudinary or a CDN instead of committing them to the repo. Consider removing `public/videos/` from git history and using Cloudinary.
- Puppeteer has been removed from dependencies to reduce serverless bundle size; if you need headless Chromium, add documentation and a compatible build package.

How to deploy locally

1. Create a `.env` file with the required variables (see `.env.example` or your existing `.env`).
2. Install dependencies: `npm install` (Node 18+ recommended).
3. Run locally: `npm run dev` and open `http://localhost:3000`.

Vercel notes

- `vercel.json` routes `/api/*` to the serverless function exported by `api/index.js` and sends other routes to `index.html`.
- Ensure the Vercel project has the environment variables configured and the project is pointed to this repository/branch. After pushing to `main`, Vercel will build and deploy automatically if connected.

If you'd like, I can remove large tracked files from history and force-push a clean main branch (I will only do this with your explicit approval).
# AmritaCare
AmritaCare is a student led initiative, a compassion driven project promoting mental health awareness among students.
