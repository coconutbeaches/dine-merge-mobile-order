import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, createServiceRoleClient, verifyAdminRole } from '@/lib/supabase-server';
import {
  buildTrustedOrderFromRequest,
  OrderRejectedError,
  type OrderRequestItem,
} from '@/lib/orderPricing';

export const runtime = 'nodejs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

type Attribution = {
  user_id: string | null;
  guest_user_id: string | null;
  stay_id: string | null;
  guest_first_name: string | null;
  customer_name: string | null;
};

export async function POST(request: NextRequest) {
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Order service unavailable' }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const body = (payload ?? {}) as Record<string, unknown>;
  const items = Array.isArray(body.cartItems)
    ? (body.cartItems as OrderRequestItem[])
    : Array.isArray(body.items)
      ? (body.items as OrderRequestItem[])
      : [];

  if (!items.length) {
    return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
  }

  const tableNumber = cleanString(body.tableNumber);
  const requestedName = cleanString(body.customerName);
  const adminCustomerId = cleanString(body.adminCustomerId);
  const guestUserId = cleanString(body.guestUserId);

  // ---- Resolve who the order is for (never trust client-supplied identity) ----
  let attribution: Attribution;

  if (adminCustomerId) {
    // Admin placing an order on behalf of a customer / hotel guest.
    const admin = await verifyAdminRole();
    if (!admin.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (UUID_PATTERN.test(adminCustomerId)) {
      attribution = {
        user_id: adminCustomerId,
        guest_user_id: null,
        stay_id: null,
        guest_first_name: null,
        customer_name: requestedName,
      };
    } else {
      attribution = {
        user_id: null,
        guest_user_id: null,
        stay_id: adminCustomerId,
        guest_first_name: null,
        customer_name: requestedName ?? adminCustomerId.replace(/_/g, ' '),
      };
    }
  } else if (guestUserId) {
    // Guest checkout: derive stay_id / name from the authoritative guests row.
    const { data: guest, error: guestError } = await serviceClient
      .from('guests')
      .select('id, stay_id, first_name')
      .eq('id', guestUserId)
      .maybeSingle();

    if (guestError) {
      console.error('[api/orders] Failed to verify guest session:', guestError.message);
      return NextResponse.json({ error: 'Failed to verify guest session' }, { status: 500 });
    }
    if (!guest) {
      return NextResponse.json({ error: 'Guest session is not recognized' }, { status: 403 });
    }

    attribution = {
      user_id: null,
      guest_user_id: guest.id as string,
      stay_id: (guest.stay_id as string) ?? null,
      guest_first_name: (guest.first_name as string) ?? null,
      customer_name: requestedName ?? (guest.first_name as string) ?? null,
    };
  } else {
    // Authenticated customer: identity comes from the verified session cookie.
    const supabase = await createServerClient();
    const { data: { user } = { user: null } } = supabase
      ? await supabase.auth.getUser()
      : { data: { user: null } };

    if (!user) {
      return NextResponse.json({ error: 'Authentication required to place this order' }, { status: 401 });
    }

    let customerName = requestedName;
    if (!customerName) {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();
      customerName = cleanString(profile?.name);
    }

    attribution = {
      user_id: user.id,
      guest_user_id: null,
      stay_id: null,
      guest_first_name: null,
      customer_name: customerName,
    };
  }

  // ---- Rebuild order_items from the trusted catalog and price them ----------
  // Names, prices and option labels come from the database, not the client, and
  // the total is recomputed. A forged display name or tampered total is ignored;
  // invalid/missing required options reject the order.
  let orderItems: unknown;
  let total: number;
  try {
    ({ orderItems, total } = await buildTrustedOrderFromRequest(serviceClient, items));
  } catch (error) {
    if (error instanceof OrderRejectedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[api/orders] Pricing failed:', error);
    return NextResponse.json({ error: 'Failed to price order' }, { status: 500 });
  }

  const { data, error } = await serviceClient
    .from('orders')
    .insert({
      user_id: attribution.user_id,
      guest_user_id: attribution.guest_user_id,
      guest_first_name: attribution.guest_first_name,
      stay_id: attribution.stay_id,
      customer_name: attribution.customer_name,
      // Trusted, catalog-rebuilt lines; typed as Json in the DB.
      order_items: orderItems as never,
      total_amount: total,
      table_number: tableNumber,
      order_status: 'new',
    })
    .select()
    .single();

  if (error) {
    console.error('[api/orders] Insert failed:', error.message);
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }

  return NextResponse.json({ order: data }, { status: 201 });
}
