-- ============================================================
-- Template for provisioning a business by hand.
--
-- Run this in the Supabase SQL editor once per new business, after
-- schema.sql / storage.sql / functions.sql have been applied. For
-- each staff login, create the auth user first (Dashboard →
-- Authentication → Add user, or invite by email) and copy their
-- generated UUID into the "auth user id" spots below before running
-- the staff inserts.
--
-- Replace every <PLACEHOLDER> before running.
-- ============================================================

-- 1. The business itself.
insert into businesses (id, name)
values (gen_random_uuid(), '<BUSINESS NAME>')
returning id; -- copy this id, you'll need it below
-- KJR = 59d3964e-c144-4110-8154-425cf38b9191

-- 2. One or more shops for that business.
insert into shops (id, business_id, name, location)
values
  (gen_random_uuid(), '<BUSINESS_ID FROM STEP 1>', '<SHOP NAME>', '<SHOP LOCATION>')
returning id; -- copy each shop id you'll need for staff below

-- 34V Premier Center: 91eca41f-5908-4566-b014-36a82df50127
-- D30 Nana Center: 2fefeaa3-e68a-4b75-b35c-99a05ba21d83


-- 3. Staff logins.
--    First create each auth user via Dashboard → Authentication →
--    Add user (set their email + a temporary password, or use
--    "invite user" so they set their own). Then link that auth user
--    to this business with a staff row:

-- Owner/admin (shop_id stays null — they see every shop in the business):
insert into staff (id, business_id, shop_id, name, role)
values (
  '<AUTH USER UUID>',        -- from the auth user you just created
  '<BUSINESS_ID FROM STEP 1>',
  null,
  '<STAFF MEMBER NAME>',
  'owner'                    -- or 'admin'
);

-- Shop staff (assigned to exactly one shop):
insert into staff (id, business_id, shop_id, name, role)
values (
  '<AUTH USER UUID>',
  '<BUSINESS_ID FROM STEP 1>',
  '<SHOP_ID FROM STEP 2>',
  '<STAFF MEMBER NAME>',
  'staff'
);

-- Repeat the staff insert for each additional login.
