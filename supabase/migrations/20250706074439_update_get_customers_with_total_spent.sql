CREATE OR REPLACE FUNCTION public.get_customers_with_total_spent(
    include_archived BOOLEAN DEFAULT FALSE
)
 RETURNS TABLE(id uuid, name text, email text, phone text, role text, customer_type text, created_at timestamp with time zone, updated_at timestamp with time zone, total_spent numeric, avatar_path text, last_order_date timestamp with time zone, archived boolean)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT
    p.id,
    p.name,
    p.email,
    p.phone,
    p.role,
    p.customer_type,
    p.created_at,
    p.updated_at,
    COALESCE(SUM(o.total_amount), 0)::numeric(10,2) as total_spent,
    p.avatar_path,
    MAX(o.created_at)::timestamptz as last_order_date,
    p.archived
  FROM
    public.profiles p
    LEFT JOIN public.orders o ON p.id = o.user_id
  WHERE
    (NOT include_archived AND p.archived = FALSE) OR include_archived
  GROUP BY
    p.id
  ORDER BY
    p.name;
$function$;