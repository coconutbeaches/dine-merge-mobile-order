create or replace function get_orders_by_product(
  p_product_id uuid,
  p_customer_type text
) returns table (j json) as $$
begin
  return query
  select
    json_build_object(
      'id', o.id,
      'created_at', o.created_at,
      'order_status', o.order_status,
      'total_price', o.total_price,
      'customer_name', p.full_name,
      'is_guest', p.is_guest
    )
  from
    orders o
    join profiles p on o.customer_id = p.id
  where
    o.id in (select order_id from order_items where product_id = p_product_id)
    and case
      when p_customer_type = 'guest' then p.is_guest = true
      when p_customer_type = 'non-guest' then p.is_guest = false
      else true
    end;
end;
$$ language plpgsql;
