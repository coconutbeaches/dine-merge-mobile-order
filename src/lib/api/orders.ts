// src/lib/api/orders.ts
import { prisma } from '@/lib/db';
import { redisClient, isRedisAvailable } from '@/lib/redis';
import type { Order, OrderItem as PrismaOrderItem, Customer, MenuItem as PrismaMenuItem, OrderStatus } from '@prisma/client';

// Define a more specific type for MenuItem to be used within OrderItem
// This should ideally match the fields you expect to use from the menuItem relation
interface MenuItemForOrder {
  id: string;
  name: string;
  price: number; // Price of the menu item itself, OrderItem.price is price_at_time_of_order
  image?: string | null;
  // Add any other fields from MenuItem you need when displaying order items
}

// Define a more specific type for OrderItem that includes the nested MenuItem
export type EnrichedOrderItem = PrismaOrderItem & {
  menuItem: MenuItemForOrder | null; // menuItem can be null if it was deleted
};

// Type for Order with its enriched items and customer
export type OrderWithDetails = Order & {
  items: EnrichedOrderItem[];
  customer?: Customer | null;
};

interface OrderItemInput {
  menuItemId: string;
  quantity: number;
  price: number; // Price at the time of order
  name: string; // Name at the time of order
}

interface CreateOrderInput {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  items: OrderItemInput[];
  total: number;
  tableNumber?: number | null;
  isTakeAway: boolean;
  notes?: string | null;
}

// Helper to parse dates from JSON cache
const parseOrderDates = (order: any): any => {
  return {
    ...order,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    // Ensure nested dates within items or customer are also parsed if necessary
    // For items, PrismaOrderItem doesn't have dates, but menuItem might if included fully
    // items: order.items.map((item: any) => ({
    //   ...item,
    //   menuItem: item.menuItem ? { ...item.menuItem, createdAt: new Date(item.menuItem.createdAt), updatedAt: new Date(item.menuItem.updatedAt) } : null,
    // })),
    // customer: order.customer ? { ...order.customer, createdAt: new Date(order.customer.createdAt), updatedAt: new Date(order.customer.updatedAt) } : null,
  };
};


export async function createOrder(orderData: CreateOrderInput): Promise<OrderWithDetails | null> {
  try {
    let customerId = orderData.customerId;

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
      await prisma.customer.update({
        where: { id: customerId },
        data: { name: orderData.customerName }, // Update name if provided for existing customer
      });
    }

    const order = await prisma.order.create({
      data: {
        customerId: customerId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        total: orderData.total,
        tableNumber: orderData.tableNumber,
        isTakeAway: orderData.isTakeAway,
        isTableService: !orderData.isTakeAway,
        status: 'PENDING',
        notes: orderData.notes,
        whatsappMessageGenerated: false,
        items: {
          create: orderData.items.map(item => ({
            menuItemId: item.menuItemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: { include: { menuItem: true } }, // Include menuItem for each item
        customer: true,
      },
    });

    if (isRedisAvailable()) {
      try {
        await redisClient.del(`orders_customer_${customerId}`);
        await redisClient.del('all_orders_admin');
        console.log(`Cache invalidated for customer ${customerId} and admin orders after new order.`);
      } catch (cacheError) {
        console.error('Redis cache invalidation error after creating order:', cacheError);
      }
    }
    // @ts-ignore TODO: Fix type mapping for menuItem if Prisma's MenuItem and MenuItemForOrder differ significantly
    return order as OrderWithDetails;
  } catch (error) {
    console.error('Error creating order:', error);
    return null;
  }
}

export async function getOrderById(id: string): Promise<OrderWithDetails | null> {
  const cacheKey = `order_${id}`;
  try {
    if (isRedisAvailable()) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`Serving order ${id} from cache`);
        const parsedData: OrderWithDetails = parseOrderDates(JSON.parse(cachedData));
        return parsedData;
      }
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true } }, // Crucial include
        customer: true,
      },
    });

    if (order && isRedisAvailable()) {
      await redisClient.set(cacheKey, JSON.stringify(order), 'EX', 3600); // Cache for 1 hour
    }
    // @ts-ignore
    return order as OrderWithDetails | null;
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error);
    return null;
  }
}

export async function getOrdersByCustomerId(customerId: string): Promise<OrderWithDetails[]> {
  const cacheKey = `orders_customer_${customerId}`;
  try {
    if (isRedisAvailable()) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`Serving orders for customer ${customerId} from cache`);
        const parsedData: OrderWithDetails[] = JSON.parse(cachedData).map(parseOrderDates);
        return parsedData;
      }
    }

    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        items: { include: { menuItem: true } }, // Crucial include
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (isRedisAvailable()) {
      await redisClient.set(cacheKey, JSON.stringify(orders), 'EX', 3600); // Cache for 1 hour
    }
    // @ts-ignore
    return orders as OrderWithDetails[];
  } catch (error) {
    console.error(`Error fetching orders for customer ${customerId}:`, error);
    return [];
  }
}

export async function getAllOrdersForAdmin(): Promise<OrderWithDetails[]> {
  const cacheKey = 'all_orders_admin';
  try {
    if (isRedisAvailable()) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log('Serving all admin orders from cache');
        const parsedData: OrderWithDetails[] = JSON.parse(cachedData).map(parseOrderDates);
        return parsedData;
      }
    }

    const orders = await prisma.order.findMany({
      include: {
        items: { include: { menuItem: true } }, // Crucial include
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (isRedisAvailable()) {
      await redisClient.set(cacheKey, JSON.stringify(orders), 'EX', 600); // Cache for 10 minutes
    }
    // @ts-ignore
    return orders as OrderWithDetails[];
  } catch (error) {
    console.error('Error fetching all orders for admin:', error);
    return [];
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderWithDetails | null> {
  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: { include: { menuItem: true } }, // Crucial include
        customer: true,
      },
    });

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
    // @ts-ignore
    return updatedOrder as OrderWithDetails | null;
  } catch (error) {
    console.error(`Error updating status for order ${orderId}:`, error);
    return null;
  }
}

export async function updateOrderPaymentStatus(orderId: string, isPaid: boolean): Promise<OrderWithDetails | null> {
  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { isPaid },
      include: {
        items: { include: { menuItem: true } }, // Crucial include
        customer: true,
      },
    });

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
    // @ts-ignore
    return updatedOrder as OrderWithDetails | null;
  } catch (error) {
    console.error(`Error updating payment status for order ${orderId}:`, error);
    return null;
  }
}

export async function addOrderNotes(orderId: string, notes: string): Promise<OrderWithDetails | null> {
  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { notes },
      include: {
        items: { include: { menuItem: true } }, // Crucial include
        customer: true,
      },
    });

    if (isRedisAvailable()) {
      try {
        await redisClient.del(`order_${orderId}`);
        if (updatedOrder.customerId) {
          await redisClient.del(`orders_customer_${updatedOrder.customerId}`);
        }
        await redisClient.del('all_orders_admin');
        console.log(`Cache invalidated for order ${orderId} after updating notes.`);
      } catch (cacheError) {
        console.error('Redis cache invalidation error after updating order notes:', cacheError);
      }
    }
    // @ts-ignore
    return updatedOrder as OrderWithDetails | null;
  } catch (error) {
    console.error(`Error adding notes to order ${orderId}:`, error);
    return null;
  }
}

export async function markOrderAsWhatsappSent(orderId: string): Promise<OrderWithDetails | null> {
  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { whatsappMessageGenerated: true },
      include: {
        items: { include: { menuItem: true } }, // Crucial include
        customer: true,
      },
    });

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
    // @ts-ignore
    return updatedOrder as OrderWithDetails | null;
  } catch (error) {
    console.error(`Error marking order ${orderId} as WhatsApp sent:`, error);
    return null;
  }
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  try {
    const orderToDelete = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true }
    });

    await prisma.order.delete({
      where: { id: orderId },
    });

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

// Ensure getOrders is exported if it's an alias or the intended function name
// Based on the error, it seems `getAllOrdersForAdmin` is the correct one to use.
// If `getOrders` was meant to be a specific function, it needs to be defined.
// For now, assuming `getAllOrdersForAdmin` is what was intended for `getOrders`.
export { getAllOrdersForAdmin as getOrders };
