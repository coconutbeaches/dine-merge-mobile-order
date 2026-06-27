import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, verifyAdminRole } from '@/lib/supabase-server';

type CustomOrderItem = {
  product: string;
  price: number;
  quantity: number;
};

const STAY_ID_PATTERN = /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCustomOrderItem(value: unknown): value is CustomOrderItem {
  if (!value || typeof value !== 'object') return false;

  const item = value as Record<string, unknown>;
  return (
    typeof item.product === 'string' &&
    item.product.trim().length > 0 &&
    typeof item.price === 'number' &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    typeof item.quantity === 'number' &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdminRole();

  if (!admin.isAdmin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json(
      { error: 'Order service unavailable' },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const body = payload as Record<string, unknown>;
  const customerId = typeof body.customerId === 'string' ? body.customerId.trim() : '';
  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : null;
  const items = Array.isArray(body.items) ? body.items : [];
  const orderDate = typeof body.orderDate === 'string' ? body.orderDate : '';
  const tableNumber = typeof body.tableNumber === 'string' && body.tableNumber.trim()
    ? body.tableNumber.trim()
    : null;

  if (!customerId || (!UUID_PATTERN.test(customerId) && !STAY_ID_PATTERN.test(customerId))) {
    return NextResponse.json(
      { error: 'Valid customer ID or stay ID is required' },
      { status: 400 }
    );
  }

  if (!items.length || !items.every(isCustomOrderItem)) {
    return NextResponse.json(
      { error: 'At least one valid custom order item is required' },
      { status: 400 }
    );
  }

  const createdAt = new Date(orderDate);
  if (Number.isNaN(createdAt.getTime())) {
    return NextResponse.json(
      { error: 'Valid order date is required' },
      { status: 400 }
    );
  }

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const orderData = {
    customer_name: customerName || customerId.replace(/_/g, ' '),
    order_items: items,
    total_amount: total,
    order_status: 'completed' as const,
    created_at: createdAt.toISOString(),
    table_number: tableNumber,
    user_id: UUID_PATTERN.test(customerId) ? customerId : null,
    stay_id: UUID_PATTERN.test(customerId) ? null : customerId,
  };

  const { data, error } = await serviceClient
    .from('orders')
    .insert(orderData)
    .select()
    .single();

  if (error) {
    console.error('[admin/custom-orders] Failed to create custom order:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      customerId,
    });

    return NextResponse.json(
      { error: 'Failed to create custom order' },
      { status: 500 }
    );
  }

  return NextResponse.json({ order: data }, { status: 201 });
}
