// src/app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { createOrder, getAllOrdersForAdmin } from '@/lib/api/orders'; // Updated getOrders to getAllOrdersForAdmin
import { z } from 'zod';

// Zod schema for order item validation
const OrderItemSchema = z.object({
  menuItemId: z.string().min(1, "Menu item ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  price: z.number().positive("Price must be positive"),
  name: z.string().min(1, "Item name is required"),
});

// Zod schema for order creation validation
const CreateOrderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Customer phone is required"), // Basic validation, can be enhanced
  items: z.array(OrderItemSchema).min(1, "Order must have at least one item"),
  total: z.number().positive("Total must be positive"),
  tableNumber: z.number().int().min(1).max(40).optional().nullable(),
  isTakeAway: z.boolean(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = CreateOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid order data", details: validationResult.error.flatten() }, { status: 400 });
    }

    const orderData = validationResult.data;
    
    const newOrder = await createOrder({
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      items: orderData.items,
      total: orderData.total,
      tableNumber: orderData.tableNumber,
      isTakeAway: orderData.isTakeAway,
      notes: orderData.notes,
    });

    if (!newOrder) {
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/orders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  try {
    const orders = await getAllOrdersForAdmin(); // Updated to use getAllOrdersForAdmin
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error in GET /api/orders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch orders", details: errorMessage }, { status: 500 });
  }
}
