# Shoe Shop Sales — app

A small React (Vite) PWA for recording and reviewing shoe shop sales. See `../SETUP.md` for the one-time Supabase setup this app depends on, and `../DEPLOY.md` for putting it on Vercel.

## Running it locally

1. Make sure you've completed `../SETUP.md` at least through step 6 (you need your Project URL and anon key, and at least one owner/admin login).
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the env template and fill in your Supabase values:
   ```
   cp .env.example .env.local
   ```
   Then edit `.env.local` with the Project URL and anon key from Supabase Settings → API.
4. Start the dev server:
   ```
   npm run dev
   ```
5. Open the printed local URL (usually `http://localhost:5173`) and sign in with the owner/admin login you created in step 5 of `../SETUP.md`.

## What's in here

- `src/auth` — login screen, session handling, and the `staff` row lookup that drives role-based access in the UI (RLS is what actually enforces it in the database).
- `src/catalog` — style + color variant management, including photo upload.
- `src/sale` — the record-a-sale flow (pick a color, add sizes/quantities/price, submit as one sale).
- `src/sales` — the sales review screen (defaults to today, switchable date range).
- `src/supabaseClient.js` — the one place the Supabase client is created, reading `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from the environment.

## Notes

- This is a PWA: on a phone, opening the deployed URL in the browser and choosing "Add to Home Screen" installs it like an app. No app store submission involved.
- It deliberately does not work offline for recording sales, every sale write needs a live connection to Supabase. Only the app shell (the UI itself) is cached for fast reloads.
- Catalog management (adding styles/colors) is currently open to any logged-in staff member, not just owners/admins, matching how the database policies are written. If you'd rather restrict it to owners/admins, that's a small change, just say so.
