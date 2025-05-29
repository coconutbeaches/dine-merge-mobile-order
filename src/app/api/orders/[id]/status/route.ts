import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrderStatus } from '@/lib/api/orders';
import { z } from 'zod';

/**
 * PATCH /api/orders/[id]/status
 * 
 * Update the status of a specific order
 * Requires a JSON body with { status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' }
 * 
 * @param request - The incoming request
 * @param context - The route context containing params
 * @returns The updated order or an error response
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Check if order exists
    const existingOrder = await getOrderById(id);
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Validate status input
    const statusSchema = z.object({
      status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], {
        errorMap: () => ({ message: 'Status must be one of: PENDING, CONFIRMED, COMPLETED, CANCELLED' })
      })
    });
    
    try {
      const { status } = statusSchema.parse(body);
      
      // Skip update if status is the same
      if (existingOrder.status === status) {
        return NextResponse.json(existingOrder);
      }
      
      // Update order status
      const updatedOrder = await updateOrderStatus({ id, status });
      
      // Return updated order
      return NextResponse.json(updatedOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid status value', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
