import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrderPaymentStatus } from '@/lib/api/orders';
import { z } from 'zod';

/**
 * PATCH /api/orders/[id]/payment
 * 
 * Update the payment status of a specific order
 * Requires a JSON body with { paymentStatus: 'UNPAID' | 'PAID' }
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
    
    // Validate payment status input
    const paymentStatusSchema = z.object({
      paymentStatus: z.enum(['UNPAID', 'PAID'], {
        errorMap: () => ({ message: 'Payment status must be one of: UNPAID, PAID' })
      })
    });
    
    try {
      const { paymentStatus } = paymentStatusSchema.parse(body);
      
      // Skip update if payment status is the same
      if (existingOrder.paymentStatus === paymentStatus) {
        return NextResponse.json(existingOrder);
      }
      
      // Update order payment status
      const updatedOrder = await updateOrderPaymentStatus({ id, paymentStatus });
      
      // Return updated order
      return NextResponse.json(updatedOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid payment status value', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating order payment status:', error);
    
    return NextResponse.json(
      { error: 'Failed to update order payment status' },
      { status: 500 }
    );
  }
}
