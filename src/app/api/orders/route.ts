import { NextRequest, NextResponse } from 'next/server';
import { getOrders, createOrder } from '@/lib/api/orders';
import { CreateOrderInput } from '@/lib/api/orders';
import { z } from 'zod';

/**
 * GET /api/orders
 * 
 * List orders with filtering and pagination
 * Supports query parameters:
 * - status: Filter by order status (all, pending, confirmed, completed, cancelled, unpaid, paid)
 * - search: Search by customer name, phone, or order number
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - customerId: Filter by customer ID
 * - startDate: Filter by date range start
 * - endDate: Filter by date range end
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const customerId = searchParams.get('customerId') || undefined;
    
    // Parse date range if provided
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (searchParams.has('startDate')) {
      startDate = new Date(searchParams.get('startDate') as string);
    }
    
    if (searchParams.has('endDate')) {
      endDate = new Date(searchParams.get('endDate') as string);
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Get orders with filters
    const { orders, totalOrders, totalPages } = await getOrders({
      status,
      search,
      page,
      limit,
      customerId,
      startDate,
      endDate,
    });
    
    // Return orders with pagination metadata
    return NextResponse.json({
      orders,
      meta: {
        totalOrders,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * 
 * Create a new order
 * Requires a JSON body with order details
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Define validation schema for order input
    const orderSchema = z.object({
      customerName: z.string().min(1, 'Customer name is required'),
      customerPhone: z.string().min(1, 'Customer phone is required'),
      items: z.array(z.object({
        menuItemId: z.string().min(1, 'Menu item ID is required'),
        name: z.string().min(1, 'Item name is required'),
        price: z.number().min(0, 'Price must be non-negative'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      })).min(1, 'At least one item is required'),
      tableNumber: z.number().int().nullable().optional(),
      isTakeAway: z.boolean().optional(),
      notes: z.string().optional(),
      whatsappSent: z.boolean().optional(),
    });
    
    // Validate input
    const validatedData = orderSchema.parse(body) as CreateOrderInput;
    
    // Create order
    const order = await createOrder(validatedData);
    
    // Return created order
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
