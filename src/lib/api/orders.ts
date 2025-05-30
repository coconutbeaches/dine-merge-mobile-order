// src/lib/api/orders.ts
import { prisma } from '@/lib/db';
import { redisClient, isRedisAvailable } from '@/lib/redis'; // Corrected import
import type { Order, OrderItem as PrismaOrderItem, Customer, OrderStatus } from '@prisma/client';

// Define a more specific type for OrderItem if needed, or use Prisma's
interface OrderItemInput {
  menuItemId: string;
  quantity: number;
  price: number; // Price at the time of order
  name: string; // Name at the time of order
  // Add any other relevant fields like options chosen
}

interface CreateOrderInput {
  customerId?: string; // Optional if creating a new customer
  customerName: string;
  customerPhone: string;
  items: OrderItemInput[];
  total: number;
  tableNumber?: number | null;
  isTakeAway: boolean;
  notes?: string | null; // Added notes to input
  // Any other fields like notes, etc.
}

// Type for Order with its items, aligning with Prisma relations
export type OrderWithItems = Order & {
  items: PrismaOrderItem[];
  customer?: Customer | null;
};

/**
 * Creates a new order.
 * @param orderData Data for the new order.
 */
export async function createOrder(orderData: CreateOrderInput): Promise<OrderWithItems | null> {
  try {
    let customerId = orderData.customerId;

    // Find or create customer
    if (!customerId) {
      let customer = await prisma.customer.findUnique({
        where: { phone: orderData.customerPhone },
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: orderData.customerName,
            phone: orderData.customerPhone,
          },
        });
      }
      customerId = customer.id;
    } else {
      // Optionally update customer name if provided for an existing customer
      await prisma.customer.update({
        where: { id: customerId },
        data: { name: orderData.customerName },
      });
    }
    

    const order = await prisma.order.create({
      data: {
        customerId: customerId,
        customerName: orderData.customerName, // Store for quick access
        customerPhone: orderData.customerPhone, // Store for quick access
        total: orderData.total,
        tableNumber: orderData.tableNumber,
        isTakeAway: orderData.isTakeAway,
        isTableService: !orderData.isTakeAway,
        status: 'PENDING', // Default status
        notes: orderData.notes, // Save notes if provided
        whatsappMessageGenerated: false, // Default to false
        items: {
          create: orderData.items.map(item => ({
            menuItemId: item.menuItemId,
            name: item.name, // Store name at time of order
            price: item.price, // Store price at time of order
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    // Invalidate relevant caches after creating an order
    if (isRedisAvailable()) {
      try {
        await redisClient.del(`orders_customer_${customerId}`);
        await redisClient.del('all_orders_admin'); // If admin fetches all orders
        console.log(`Cache invalidated for customer ${customerId} and admin orders after new order.`);
      } catch (cacheError) {
        console.error('Redis cache invalidation error after creating order:', cacheError);
      }
    }

    return order;
  } catch (error) {
    console.error('Error creating order:', error);
    return null;
  }
}

/**
 * Fetches a single order by its ID.
 * @param id The ID of the order to fetch.
 */
export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  const cacheKey = `order_${id}`;
  try {
    if (isRedisAvailable()) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`Serving order ${id} from cache`);
        const parsedData: OrderWithItems = JSON.parse(cachedData);
        return {
          ...parsedData,
          createdAt: new Date(parsedData.createdAt),
          updatedAt: new Date(parsedData.updatedAt),
          items: parsedData.items.map(item => ({
            ...item,
            // Ensure any nested dates in items are also converted if necessary
          }))
        };
      }
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });

    if (order && isRedisAvailable()) {
      await redisClient.set(cacheKey, JSON.stringify(order), 'EX', 3600); // Cache for 1 hour
    }
    return order;
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error);
    return null;
  }
}

/**
 * Fetches all orders for a specific customer.
 * @param customerId The ID of the customer.
 */
export async function getOrdersByCustomerId(customerId: string): Promise<OrderWithItems[]> {
  const cacheKey = `orders_customer_${customerId}`;
  try {
    if (isRedisAvailable()) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`Serving orders for customer ${customerId} from cache`);
        const parsedData: OrderWithItems[] = JSON.parse(cachedData);
        return parsedData.map(order => ({
          ...order,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt),
          items: order.items.map(item => ({
            ...item,
          }))
        }));
      }
    }

    const orders = await prisma.order.findMany({
      where: { customerId },
      include: { items: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });

    if (isRedisAvailable()) {
      await redisClient.set(cacheKey, JSON.stringify(orders), 'EX', 3600); // Cache for 1 hour
    }
    return orders;
  } catch (error) {
    console.error(`Error fetching orders for customer ${customerId}:`, error);
    return [];
  }
}

/**
 * Fetches all orders for the admin dashboard (could be paginated in a real app).
 */
export async function getAllOrdersForAdmin(): Promise<OrderWithItems[]> {
    const cacheKey = 'all_orders_admin'; // Example cache key
    try {
      if (isRedisAvailable()) {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          console.log('Serving all admin orders from cache');
          const parsedData: OrderWithItems[] = JSON.parse(cachedData);
           return parsedData.map(order => ({
            ...order,
            createdAt: new Date(order.createdAt),
            updatedAt: new Date(order.updatedAt),
            // Potentially transform items if needed
          }));
        }
      }
  
      const orders = await prisma.order.findMany({
        include: { items: true, customer: true }, // Include customer details
        orderBy: { createdAt: 'desc' },
      });
  
      if (isRedisAvailable()) {
        await redisClient.set(cacheKey, JSON.stringify(orders), 'EX', 600); // Cache for 10 minutes
      }
      return orders;
    } catch (error) {
      console.error('Error fetching all orders for admin:', error);
      return [];
    }
  }

/**
 * Updates the status of an order.
 * @param orderId The ID of the order to update.
 * @param status The new status.
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderWithItems | null> {
  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: true, customer: true },
    });

    // Invalidate relevant caches
    if (isRedisAvailable()) {
      try {
        await redisClient.del(`order_${orderId}`);
        if (updatedOrder.customerId) {
          await redisClient.del(`orders_customer_${updatedOrder.customerId}`);
        }
        await redisClient.del('all_orders_admin');
        console.log(`Cache invalidated for order ${orderId} and related views after status update.`);
      } catch (cacheError) {
         console.error('Redis cache invalidation error after updating order status:', cacheError);
      }
    }
    return updatedOrder;
  } catch (error) {
    console.error(`Error updating status for order ${orderId}:`, error);
    return null;
  }
}

/**
 * Updates the payment status of an order.
 * @param orderId The ID of the order to update.
 * @param paymentStatus The new payment status.
 */
export async function updateOrderPaymentStatus(orderId: string, isPaid: boolean): Promise<OrderWithItems | null> {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { isPaid }, // Assuming your Prisma schema has an `isPaid` field
        include: { items: true, customer: true },
      });
  
      // Invalidate relevant caches
      if (isRedisAvailable()) {
        try {
          await redisClient.del(`order_${orderId}`);
          if (updatedOrder.customerId) {
            await redisClient.del(`orders_customer_${updatedOrder.customerId}`);
          }
          await redisClient.del('all_orders_admin');
          console.log(`Cache invalidated for order ${orderId} and related views after payment status update.`);
        } catch (cacheError) {
           console.error('Redis cache invalidation error after updating payment status:', cacheError);
        }
      }
      return updatedOrder;
    } catch (error) {
      console.error(`Error updating payment status for order ${orderId}:`, error);
      return null;
    }
  }

/**
 * Adds or updates notes for an order.
 * @param orderId The ID of the order.
 * @param notes The notes to add/update.
 */
export async function addOrderNotes(orderId: string, notes: string): Promise<OrderWithItems | null> {
  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { notes },
      include: { items: true, customer: true },
    });

    // Invalidate relevant caches
    if (isRedisAvailable()) {
      try {
        await redisClient.del(`order_${orderId}`);
        if (updatedOrder.customerId) {
          await redisClient.del(`orders_customer_${updatedOrder.customerId}`);
        }
        await redisClient.del('all_orders_admin'); // If admin views might show notes
        console.log(`Cache invalidated for order ${orderId} after updating notes.`);
      } catch (cacheError) {
        console.error('Redis cache invalidation error after updating order notes:', cacheError);
      }
    }
    return updatedOrder;
  } catch (error) {
    console.error(`Error adding notes to order ${orderId}:`, error);
    return null;
  }
}

/**
 * Marks an order as WhatsApp message generated.
 * @param orderId The ID of the order.
 */
export async function markOrderAsWhatsappSent(orderId: string): Promise<OrderWithItems | null> {
  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { whatsappMessageGenerated: true },
      include: { items: true, customer: true },
    });

    // Invalidate relevant caches
    if (isRedisAvailable()) {
      try {
        await redisClient.del(`order_${orderId}`);
        if (updatedOrder.customerId) {
          await redisClient.del(`orders_customer_${updatedOrder.customerId}`);
        }
        await redisClient.del('all_orders_admin');
        console.log(`Cache invalidated for order ${orderId} after marking as WhatsApp sent.`);
      } catch (cacheError) {
        console.error('Redis cache invalidation error after marking order as WhatsApp sent:', cacheError);
      }
    }
    return updatedOrder;
  } catch (error) {
    console.error(`Error marking order ${orderId} as WhatsApp sent:`, error);
    return null;
  }
}

/**
 * Deletes an order.
 * @param orderId The ID of the order to delete.
 * @returns True if deletion was successful, false otherwise.
 */
export async function deleteOrder(orderId: string): Promise<boolean> {
  try {
    // Fetch customerId before deleting for cache invalidation
    const orderToDelete = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true }
    });

    await prisma.order.delete({
      where: { id: orderId },
    });

    // Invalidate relevant caches
    if (isRedisAvailable()) {
      try {
        await redisClient.del(`order_${orderId}`);
        if (orderToDelete?.customerId) {
          await redisClient.del(`orders_customer_${orderToDelete.customerId}`);
        }
        await redisClient.del('all_orders_admin');
        console.log(`Cache invalidated for order ${orderId} and related views after deletion.`);
      } catch (cacheError) {
        console.error('Redis cache invalidation error after deleting order:', cacheError);
      }
    }
    return true;
  } catch (error) {
    console.error(`Error deleting order ${orderId}:`, error);
    return false;
  }
}
