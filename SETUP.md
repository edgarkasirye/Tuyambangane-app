# Supabase project setup

Do these in order. Everything here happens in the Supabase dashboard or its SQL editor, nothing needs the app code yet.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Pick a name, a region close to Uganda/Kenya (e.g. an EU or a nearby region with the lowest latency Supabase offers you), and set a database password. Save that password somewhere safe, you won't be shown it again.
3. Wait for the project to finish provisioning (a couple of minutes).

## 2. Turn off public self-signup

This app has no "sign up" screen, staff logins are created by you (step 5). Since Supabase projects allow public signup by default, turn it off so nobody can create their own login:

1. In the dashboard, go to **Authentication → Providers → Email**.
2. Turn off **"Allow new users to sign up"**.
3. You can also turn off **"Confirm email"** if you don't want a confirmation email step, since you're setting passwords directly for each staff member rather than having them register themselves.

## 3. Apply the schema

Go to **SQL Editor** in the dashboard and run these three files in this exact order (each as its own query, wait for it to succeed before running the next):

1. `supabase/schema.sql` — tables and row-level security policies.
2. `supabase/storage.sql` — the photo storage bucket and its policies.
3. `supabase/functions.sql` — the `record_sale` function the app uses to save a sale.

If any of them errors, stop and paste me the error rather than continuing, since the later files depend on the earlier ones.

Then run every file in `supabase/migrations/`, in number order (`001_…`, `002_…`, …). Each one is a later change on top of the three files above:

- `001_edit_and_backdate_sales.sql` — lets sales be backdated, edited and deleted (staff: only sales they recorded; owner/admin: any sale).

## 4. Confirm storage looks right

Go to **Storage** in the dashboard. You should see a bucket called `variant-photos` marked public. You don't need to configure anything else there, the policies from step 3 already restrict who can upload to it.

## 5. Create your first business, shop, and staff logins

Open `supabase/provisioning_template.sql`. It's a fill-in-the-blanks template, not something to run as-is. For each staff member (including yourself as owner/admin):

1. Go to **Authentication → Users → Add user** and create their login with an email and a temporary password (or use "invite" to have them set their own). Copy the UUID it generates.
2. Use that UUID plus the business/shop IDs from the template's earlier steps to insert their `staff` row, in the SQL editor.

Do this once now for your own owner/admin login so you can log into the app and start building out the catalog. You can add more shops and staff later using the same pattern.

## 6. Get your API credentials

Go to **Settings → API**. You'll need two values for the app:

- **Project URL** (looks like `https://xxxxx.supabase.co`)
- **anon public key** (a long string, safe to expose in a browser app since RLS is what actually protects the data)

Hold onto both, I'll tell you exactly where they go when we get to running the app (they go in a `.env.local` file that never gets committed to git).

---

Once you've done steps 1–6 and logged in successfully as your owner/admin user is possible in principle (we'll test it once the app exists), let me know and I'll walk you through running the app locally and then deploying it.
