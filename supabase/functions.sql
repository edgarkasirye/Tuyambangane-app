-- ============================================================
-- record_sale: create a sale and all of its line items atomically.
--
-- Why an RPC instead of two client-side inserts: a sale can have
-- several line items, and we never want a sale to exist with only
-- some of its items saved (e.g. the app crashes mid-submit). Wrapping
-- both inserts in one plpgsql function means they succeed or fail
-- together in a single transaction.
--
-- This function is SECURITY INVOKER (the default — no security
-- definer here, unlike current_staff()), so it runs with the calling
-- staff member's own permissions. That means the existing RLS insert
-- policies on sales and sale_line_items still apply exactly as
-- written: a staff member can only insert for their own shop, an
-- owner/admin for any shop in their business, and if either insert
-- would violate a policy the whole function aborts and nothing is
-- saved. This function is a convenience for atomicity, not a way
-- around RLS.
--
-- p_line_items shape (a JSON array), one object per line item:
--   [{ "variant_id": "...", "size": "42", "quantity": 1,
--      "unit_type": "pair", "unit_price": 45000 }, ...]
-- ============================================================

create or replace function record_sale(
  p_shop_id uuid,
  p_line_items jsonb
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

  insert into sales (business_id, shop_id, staff_id)
  values (
    (select business_id from current_staff()),
    p_shop_id,
    auth.uid()
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

grant execute on function record_sale(uuid, jsonb) to authenticated;
