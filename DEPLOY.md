# Deploying to Vercel

Do this after the app runs correctly for you locally (see `app/README.md`).

## 1. Push the code to a Git repository

Vercel deploys from a Git repo (GitHub, GitLab, or Bitbucket). If this project isn't in one yet:

```
cd shoe-sales-app
git init
git add .
git commit -m "Initial version of the sales app"
```

Then create a new repository on GitHub (or whichever you use) and push it there, following GitHub's own instructions for an existing local repo.

## 2. Import the project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (or create an account).
2. Click **Add New → Project** and select the repository you just pushed.
3. Vercel should detect it as a Vite project automatically. If it asks, set:
   - **Root Directory**: `app` (the repo has the Supabase SQL files at the top level and the actual web app in the `app` folder)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

## 3. Add your environment variables

Still in the Vercel project setup (or later under **Settings → Environment Variables**), add:

- `VITE_SUPABASE_URL` — your Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon public key

These are the same two values from `SETUP.md` step 6, and the same ones you put in your local `.env.local`.

## 4. Deploy

Click **Deploy**. Vercel will build the app and give you a live URL (something like `your-project.vercel.app`).

## 5. Try it as an app on a phone

Open that URL on a phone, in Chrome (Android) or Safari (iPhone), and use the browser's "Add to Home Screen" option. It'll behave like an installed app from there, without ever going through an app store.

## Updating later

Any time you push a new commit to the repository, Vercel rebuilds and redeploys automatically. No separate "publish" step needed.
