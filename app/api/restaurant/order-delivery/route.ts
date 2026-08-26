import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { normalizeRestaurantServiceLocation } from '@/lib/restaurantServiceLocation';
import {
  hashRestaurantGuestHandshakeRef,
  verifyRestaurantGuestHandshakeRef,
} from '@/server/restaurantGuestHandshake';

export const runtime = 'nodejs';

type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'uncertain';

type DeliveryPayload = {
  status?: DeliveryStatus;
  code?: string;
  message_id?: string;
  safe_manual_fallback?: boolean;
};

const validStatuses = new Set<DeliveryStatus>([
  'pending',
  'sent',
  'failed',
  'uncertain',
]);

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const orderId = Number(body.order_id);
  const handshakeRef = String(body.handshake_ref ?? '').trim();
  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }
  if (!handshakeRef || !verifyRestaurantGuestHandshakeRef(handshakeRef)) {
    return NextResponse.json(
      {
        status: 'failed',
        code: 'invalid_handshake_ref',
        safe_manual_fallback: true,
      },
      { status: 200 },
    );
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json(
      {
        status: 'uncertain',
        code: 'delivery_service_unavailable',
        safe_manual_fallback: false,
      },
      { status: 200 },
    );
  }

  const [{ data: order, error: orderError }, { data: handshake, error: handshakeError }] =
    await Promise.all([
      serviceClient
        .from('orders')
        .select('id,table_number,guest_user_id,stay_id')
        .eq('id', orderId)
        .maybeSingle(),
      serviceClient
        .from('restaurant_guest_handshakes')
        .select('status,table_number,bound_guest_user_id,bound_guest_stay_id')
        .eq('ref_hash', hashRestaurantGuestHandshakeRef(handshakeRef))
        .maybeSingle(),
    ]);

  if (orderError || handshakeError || !order || !handshake) {
    return NextResponse.json(
      {
        status: 'uncertain',
        code: 'delivery_identity_lookup_error',
        safe_manual_fallback: false,
      },
      { status: 200 },
    );
  }

  const orderLocation = normalizeRestaurantServiceLocation(order.table_number);
  const handshakeLocation = normalizeRestaurantServiceLocation(handshake.table_number);
  if (!orderLocation) {
    return NextResponse.json(
      {
        status: 'failed',
        code: 'table_not_enabled',
        safe_manual_fallback: true,
      },
      { status: 200 },
    );
  }

  const orderGuestId = String(order.guest_user_id ?? '').trim();
  const orderStayId = String(order.stay_id ?? '').trim();
  const boundGuestId = String(handshake.bound_guest_user_id ?? '').trim();
  const boundStayId = String(handshake.bound_guest_stay_id ?? '').trim();

  if (
    handshake.status !== 'completed' ||
    !handshakeLocation ||
    !orderGuestId ||
    !boundGuestId ||
    orderGuestId !== boundGuestId ||
    orderStayId !== boundStayId
  ) {
    console.warn('[restaurant-order-delivery] exact guest/WhatsApp binding missing or mismatched', {
      orderId,
      orderLocation,
      handshakeLocation,
      orderGuestPresent: Boolean(orderGuestId),
      boundGuestPresent: Boolean(boundGuestId),
    });
    return NextResponse.json(
      {
        status: 'failed',
        code: boundGuestId ? 'guest_whatsapp_binding_mismatch' : 'guest_whatsapp_binding_required',
        safe_manual_fallback: true,
      },
      { status: 200 },
    );
  }

  try {
    const { data, error } = await serviceClient.functions.invoke<DeliveryPayload>(
      'restaurant-auto-delivery',
      {
        body: {
          order_id: orderId,
          handshake_ref: handshakeRef,
        },
      },
    );

    if (error) {
      console.error('[restaurant-order-delivery] edge invocation failed', {
        orderId,
        error: error.message,
      });
      return NextResponse.json(
        {
          status: 'uncertain',
          code: 'delivery_service_unreachable',
          safe_manual_fallback: false,
        },
        { status: 200 },
      );
    }

    const status = data?.status;
    if (!status || !validStatuses.has(status)) {
      console.error('[restaurant-order-delivery] invalid edge response', { orderId });
      return NextResponse.json(
        {
          status: 'uncertain',
          code: 'invalid_delivery_response',
          safe_manual_fallback: false,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      status,
      ...(data.code ? { code: data.code } : {}),
      ...(data.message_id ? { message_id: data.message_id } : {}),
      safe_manual_fallback: data.safe_manual_fallback === true,
    });
  } catch (error) {
    console.error('[restaurant-order-delivery] unexpected invocation error', {
      orderId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return NextResponse.json(
      {
        status: 'uncertain',
        code: 'delivery_service_unreachable',
        safe_manual_fallback: false,
      },
      { status: 200 },
    );
  }
}
