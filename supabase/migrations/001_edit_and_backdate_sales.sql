-- ============================================================
-- Migration 001: edit, delete, and backdate sales.
--
-- Run once in the Supabase SQL editor, after schema.sql,
-- storage.sql and functions.sql have been applied.
--
-- Rules this implements:
--   * Anyone can record a sale for any past date (never the future).
--   * Staff can edit or delete only sales they recorded themselves.
--   * Owner/admin can edit or delete any sale in their business.
--   * Every edit is stamped with who changed it and when.
-- ============================================================

-- ---------- Audit columns ----------

alter table sales
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by uuid references staff(id);

-- ---------- No sales in the future ----------
-- A trigger rather than a check constraint, because "now" moves and
-- a check constraint must be immutable. Covers inserts and edits from
-- every path (RPC or direct API). The 5 minute allowance absorbs small
-- clock differences between a phone and the server.

create or replace function sales_reject_future_sold_at()
returns trigger
language plpgsql
as $$
begin
  if new.sold_at > now() + interval '5 minutes' then
    raise exception 'A sale cannot be dated in the future.';
  end if;
  return new;
end;
$$;

drop trigger if exists sales_reject_future_sold_at on sales;
create trigger sales_reject_future_sold_at
  before insert or update of sold_at on sales
  for each row execute function sales_reject_future_sold_at();

-- ---------- Who may edit a given sale ----------
-- Security invoker on purpose: the lookup on sales is itself filtered
-- by the "sales visibility" policy, so a caller can never get "true"
-- for a sale they can't even see.

create or replace function can_edit_sale(p_sale_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from sales s
    where s.id = p_sale_id
      and s.business_id = (select business_id from current_staff())
      and (
        (select role from current_staff()) in ('owner', 'admin')
        or s.staff_id = auth.uid()
      )
  );
$$;

grant execute on function can_edit_sale(uuid) to authenticated;

-- ---------- Sales: update / delete policies ----------

-- Only these columns may ever be changed after a sale is recorded.
-- In particular staff_id (who recorded it) and business_id are fixed.
revoke update on sales from authenticated;
grant update (shop_id, sold_at, updated_at, updated_by) on sales to authenticated;

drop policy if exists "edit own or any as owner/admin" on sales;
create policy "edit own or any as owner/admin" on sales
  for update
  using (can_edit_sale(id))
  with check (
    business_id = (select business_id from current_staff())
    and (
      -- owner/admin: may move the sale to any shop in the business
      (
        (select role from current_staff()) in ('owner', 'admin')
        and shop_id in (select id from shops where business_id = (select business_id from current_staff()))
      )
      -- staff: their own sale, kept in their own shop
      or (
        staff_id = auth.uid()
        and shop_id = (select shop_id from current_staff())
      )
    )
  );

drop policy if exists "delete own or any as owner/admin" on sales;
create policy "delete own or any as owner/admin" on sales
  for delete
  using (can_edit_sale(id));
-- Line items go with the sale via "on delete cascade".

-- ---------- Sale line items: insert / delete policies ----------

-- Replaces the original insert policy, which only allowed the person
-- who recorded the sale to add items. An owner/admin editing a staff
-- member's sale also needs to (re)insert its items.
drop policy if exists "add line items to own sale" on sale_line_items;
drop policy if exists "add line items to editable sale" on sale_line_items;
create policy "add line items to editable sale" on sale_line_items
  for insert with check (can_edit_sale(sale_id));

drop policy if exists "remove line items from editable sale" on sale_line_items;
create policy "remove line items from editable sale" on sale_line_items
  for delete using (can_edit_sale(sale_id));

-- ---------- record_sale: now accepts an optional sale date ----------

-- Drop the old 2-argument version so PostgREST doesn't see two
-- overloads and refuse the call as ambiguous.
drop function if exists record_sale(uuid, jsonb);

create or replace function record_sale(
  p_shop_id uuid,
  p_line_items jsonb,
  p_sold_at timestamptz default null -- null = right now
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_item jsonb;
begin
  if jsonb_array_length(p_line_items) = 0 then
    raise exception 'a sale needs at least one line item';
  end if;

  insert into sales (business_id, shop_id, staff_id, sold_at)
  values (
    (select business_id from current_staff()),
    p_shop_id,
    auth.uid(),
    coalesce(p_sold_at, now())
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_line_items)
  loop
    insert into sale_line_items (sale_id, variant_id, size, quantity, unit_type, unit_price)
    values (
      v_sale_id,
      (v_item->>'variant_id')::uuid,
      v_item->>'size',
      (v_item->>'quantity')::integer,
      v_item->>'unit_type',
      (v_item->>'unit_price')::numeric
    );
  end loop;

  return v_sale_id;
end;
$$;

grant execute on function record_sale(uuid, jsonb, timestamptz) to authenticated;

-- ---------- update_sale: replace a sale's details atomically ----------
-- Same p_line_items shape as record_sale. The existing line items are
-- replaced wholesale, inside one transaction, so an edit can never
-- leave a sale half-updated. Security invoker, so every policy above
-- still applies.

create or replace function update_sale(
  p_sale_id uuid,
  p_shop_id uuid,
  p_sold_at timestamptz,
  p_line_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
begin
  if jsonb_array_length(p_line_items) = 0 then
    raise exception 'a sale needs at least one line item';
  end if;

  update sales
  set shop_id = p_shop_id,
      sold_at = p_sold_at,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_sale_id;

  -- RLS silently skips rows the caller may not edit, so zero rows
  -- updated means "not found or not allowed".
  if not found then
    raise exception 'This sale was not found, or you are not allowed to edit it.';
  end if;

  delete from sale_line_items where sale_id = p_sale_id;

  for v_item in select * from jsonb_array_elements(p_line_items)
  loop
    insert into sale_line_items (sale_id, variant_id, size, quantity, unit_type, unit_price)
    values (
      p_sale_id,
      (v_item->>'variant_id')::uuid,
      v_item->>'size',
      (v_item->>'quantity')::integer,
      v_item->>'unit_type',
      (v_item->>'unit_price')::numeric
    );
  end loop;
end;
$$;

grant execute on function update_sale(uuid, uuid, timestamptz, jsonb) to authenticated;
