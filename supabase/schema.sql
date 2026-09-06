-- ============================================================
-- Shoe shop sales app — v1 schema (Postgres / Supabase)
--
-- Multi-tenant: every business's data is isolated from every other
-- business. Shops belong to a business. The catalog (styles + their
-- color variants) is shared across a business's shops. Sales are
-- scoped to the shop and staff member who recorded them.
--
-- This is a corrected version of the original draft. Two bugs were
-- fixed, both explained inline where the fix lives:
--   1. current_staff() is now SECURITY DEFINER, which avoids an
--      infinite-recursion error that every single RLS policy in this
--      file would otherwise hit.
--   2. The "record a sale" policy now lets an owner/admin record a
--      sale for any shop in their business, not just staff.
-- ============================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------- Core tenancy ----------

create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table shops (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

-- One row per logged-in staff member, extending Supabase's auth.users.
-- shop_id is null for an owner/admin who oversees the whole business.
create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  shop_id uuid references shops(id) on delete set null,
  name text not null,
  role text not null check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now()
);

-- ---------- Catalog ----------

-- A style is the shoe itself: article number, name, recommended price,
-- and the sizes it typically comes in.
create table styles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  art_number text not null,
  name text not null,
  recommended_price numeric(12,2),
  sizes_offered text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, art_number)
);

-- A variant is one color of a style. Adding a "sister color" only
-- means a new row here (color + picture) — everything else, name,
-- recommended price, sizes, is inherited from the style.
create table variants (
  id uuid primary key default gen_random_uuid(),
  style_id uuid not null references styles(id) on delete cascade,
  color text not null,
  image_url text, -- points at a Supabase Storage object, not the image itself
  active boolean not null default true, -- toggle off when sold out, keep the history
  created_at timestamptz not null default now()
);

-- ---------- Sales ----------

create table sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  staff_id uuid not null references staff(id),
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
  -- v2 note: a nullable customer_id / credit reference can be added
  -- here later without touching anything else. Not built in v1.
);

create table sale_line_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  variant_id uuid not null references variants(id),
  size text,
  quantity integer not null check (quantity > 0),
  unit_type text not null check (unit_type in ('pair', 'carton')),
  unit_price numeric(12,2) not null, -- what was actually charged, snapshot at sale time
  total_amount numeric(14,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);

-- Helpful indexes for the queries the app actually runs.
create index sales_business_sold_at_idx on sales (business_id, sold_at desc);
create index sales_shop_sold_at_idx on sales (shop_id, sold_at desc);
create index variants_style_idx on variants (style_id);
create index sale_line_items_sale_idx on sale_line_items (sale_id);
create index sale_line_items_variant_idx on sale_line_items (variant_id);

-- ============================================================
-- Row Level Security
-- Staff see only their own shop's sales. An owner/admin (shop_id is
-- null on their staff row) sees every shop in their business. No
-- business ever sees another business's rows, full stop.
-- ============================================================

-- IMPORTANT: this function is SECURITY DEFINER on purpose.
--
-- Every policy below calls current_staff() to look up the caller's
-- business_id / shop_id / role. If this function were a normal
-- (security invoker) function, its internal "select from staff"
-- would itself be subject to staff's own RLS policy below — which
-- calls current_staff() — which queries staff again — forever.
-- Postgres detects this and raises "infinite recursion detected in
-- policy for relation staff", and it would happen on every single
-- query against every table, not just staff.
--
-- Marking it SECURITY DEFINER makes its internal query run as the
-- function's owner instead of the calling user. As long as this
-- function is owned by the same role that owns the `staff` table
-- (true by default for anything you run via the Supabase SQL editor
-- or CLI migrations — both are created by the `postgres` role), that
-- owner bypasses RLS by default, so the lookup inside current_staff()
-- reads the raw table instead of re-entering its policy. That's what
-- breaks the recursion.
--
-- Do not add `force row level security` to the staff table — that
-- would make RLS apply even to the table owner and defeat this fix.
-- Do not change the function owner to a non-owning role either.
create or replace function current_staff()
returns staff
language sql
stable
security definer
set search_path = public
as $$
  select * from staff where id = auth.uid();
$$;

grant execute on function current_staff() to authenticated;

alter table businesses enable row level security;
alter table shops enable row level security;
alter table staff enable row level security;
alter table styles enable row level security;
alter table variants enable row level security;
alter table sales enable row level security;
alter table sale_line_items enable row level security;

create policy "own business only" on businesses
  for select using (id = (select business_id from current_staff()));

create policy "own business's shops" on shops
  for select using (business_id = (select business_id from current_staff()));

create policy "own business's staff" on staff
  for select using (business_id = (select business_id from current_staff()));

create policy "own business's styles" on styles
  for all using (business_id = (select business_id from current_staff()));

create policy "own business's variants" on variants
  for all using (
    style_id in (select id from styles where business_id = (select business_id from current_staff()))
  );

create policy "sales visibility" on sales
  for select using (
    business_id = (select business_id from current_staff())
    and (
      (select role from current_staff()) in ('owner', 'admin')
      or shop_id = (select shop_id from current_staff())
    )
  );

-- Fixed: the original version required shop_id to equal the caller's
-- own staff.shop_id. An owner/admin's shop_id is null by design (see
-- the staff table comment above), and "shop_id = null" is never true
-- for any value, so the original policy silently rejected every sale
-- an owner/admin ever tried to record, for any shop. This version
-- lets an owner/admin record a sale for any shop in their own
-- business, and keeps staff restricted to their assigned shop.
create policy "record a sale for own shop" on sales
  for insert with check (
    business_id = (select business_id from current_staff())
    and (
      shop_id = (select shop_id from current_staff())
      or (
        (select role from current_staff()) in ('owner', 'admin')
        and shop_id in (select id from shops where business_id = (select business_id from current_staff()))
      )
    )
  );

-- This policy looks unrestricted at first glance ("select id from
-- sales" with no filter written here) but it isn't: that inner query
-- is itself subject to the "sales visibility" policy above, so it
-- silently narrows to whatever sales the current user is already
-- allowed to see. Left as-is rather than duplicating the visibility
-- logic here, but documenting it so it doesn't look like a hole.
create policy "sale line item visibility" on sale_line_items
  for select using (
    sale_id in (select id from sales)
  );

create policy "add line items to own sale" on sale_line_items
  for insert with check (
    sale_id in (select id from sales where staff_id = auth.uid())
  );
