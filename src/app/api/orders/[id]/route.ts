import { NextRequest, NextResponse } from 'next/server';
import { 
  getOrderById, 
  updateOrderStatus, 
  updateOrderPaymentStatus, 
  deleteOrder,
  addOrderNotes,
  markOrderAsWhatsappSent
} from '@/lib/api/orders';
import { z } from 'zod';

/**
 * GET /api/orders/[id]
 * 
 * Get a specific order by ID
 * 
 * @param request - The incoming request
 * @param context - The route context containing params
 * @returns The order or an error response
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get order by ID
    const order = await getOrderById(id);
    
    // Check if order exists
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Return order
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[id]
 * 
 * Update a specific order
 * Supports updating:
 * - status
 * - paymentStatus
 * - notes
 * - whatsappSent
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
    
    // Determine what is being updated
    let updatedOrder;
    
    // Update order status
    if (body.status) {
      // Validate status
      const statusSchema = z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']);
      
      try {
        const validStatus = statusSchema.parse(body.status);
        updatedOrder = await updateOrderStatus({ id, status: validStatus });
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }
    }
    
    // Update payment status
    if (body.paymentStatus) {
      // Validate payment status
      const paymentStatusSchema = z.enum(['UNPAID', 'PAID']);
      
      try {
        const validPaymentStatus = paymentStatusSchema.parse(body.paymentStatus);
        updatedOrder = await updateOrderPaymentStatus({ id, paymentStatus: validPaymentStatus });
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid payment status value' },
          { status: 400 }
        );
      }
    }
    
    // Update notes
    if (body.notes !== undefined) {
      const notesSchema = z.string().max(500);
      
      try {
        const validNotes = notesSchema.parse(body.notes);
        updatedOrder = await addOrderNotes(id, validNotes);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid notes value' },
          { status: 400 }
        );
      }
    }
    
    // Update WhatsApp sent status
    if (body.whatsappSent !== undefined) {
      const whatsappSentSchema = z.boolean();
      
      try {
        const validWhatsappSent = whatsappSentSchema.parse(body.whatsappSent);
        
        if (validWhatsappSent) {
          updatedOrder = await markOrderAsWhatsappSent(id);
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid whatsappSent value' },
          { status: 400 }
        );
      }
    }
    
    // If nothing was updated
    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }
    
    // Return updated order
    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id]
 * 
 * Delete a specific order
 * This is typically only available to admins
 * 
 * @param request - The incoming request
 * @param context - The route context containing params
 * @returns Success message or an error response
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Check if order exists
    const existingOrder = await getOrderById(id);
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Delete order
    await deleteOrder(id);
    
    // Return success
    return NextResponse.json(
      { message: 'Order deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting order:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
