import { prisma } from '@/lib/db';
import { Order, OrderItem, OrderStatus, PaymentStatus } from '@prisma/client';
import { cache } from 'react';
import { redis } from '@/lib/redis';

// Types
export type OrderWithItems = Order & {
  items: (OrderItem & {
    menuItem: {
      id: string;
      name: string;
      image: string | null;
    } | null;
  })[];
};

export type OrderWithCustomer = Order & {
  customer: {
    id: string;
    name: string | null;
    phone: string;
    totalOrders: number;
    totalSpent: number;
  } | null;
};

export type OrderWithItemsAndCustomer = OrderWithItems & OrderWithCustomer;

export type OrdersResponse = {
  orders: OrderWithItems[];
  totalOrders: number;
  totalPages: number;
};

export type CreateOrderInput = {
  customerName: string;
  customerPhone: string;
  items: {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  tableNumber?: number | null;
  isTakeAway?: boolean;
  notes?: string;
  whatsappSent?: boolean;
};

export type UpdateOrderStatusInput = {
  id: string;
  status: OrderStatus;
};

export type UpdateOrderPaymentStatusInput = {
  id: string;
  paymentStatus: PaymentStatus;
};

// Cache duration in seconds
const CACHE_TTL = 60 * 5; // 5 minutes (shorter than menu items since orders change frequently)

/**
 * Get all orders with filtering options
 * 
 * @param options - Filter and pagination options
 * @returns Orders with pagination info
 */
export async function getOrders(options?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<OrdersResponse> {
  const {
    status,
    search = '',
    page = 1,
    limit = 20,
    customerId,
    startDate,
    endDate,
  } = options || {};
  
  // Calculate pagination
  const skip = (page - 1) * limit;
  
  // Build where clause based on filters
  const where: any = {};
  
  // Filter by status
  if (status && status !== 'all') {
    if (status === 'unpaid') {
      where.paymentStatus = 'UNPAID';
    } else if (status === 'paid') {
      where.paymentStatus = 'PAID';
    } else if (status === 'confirming') {
      where.status = 'CONFIRMED';
      where.paymentStatus = 'UNPAID';
    } else if (['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }
  }
  
  // Filter by customer ID
  if (customerId) {
    where.customerId = customerId;
  }
  
  // Filter by date range
  if (startDate) {
    where.createdAt = {
      ...(where.createdAt || {}),
      gte: startDate,
    };
  }
  
  if (endDate) {
    where.createdAt = {
      ...(where.createdAt || {}),
      lte: endDate,
    };
  }
  
  // Search by customer name, phone, or order number
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search } },
      { orderNumber: isNaN(parseInt(search)) ? undefined : parseInt(search) },
    ].filter(Boolean);
  }
  
  // Query for orders count (for pagination)
  const totalOrders = await prisma.order.count({ where });
  const totalPages = Math.ceil(totalOrders / limit);
  
  // Query for orders with items
  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          menuItem: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip,
    take: limit,
  });
  
  return {
    orders,
    totalOrders,
    totalPages,
  };
}

/**
 * Get an order by ID
 * 
 * Cached with React cache() for server components
 */
export const getOrderById = cache(async (id: string): Promise<OrderWithItemsAndCustomer | null> => {
  if (!id) return null;
  
  const cacheKey = `order:${id}`;
  
  // Try to get from Redis cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Redis cache error:', error);
  }
  
  // Query database if not in cache
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          menuItem: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          totalOrders: true,
          totalSpent: true,
        },
      },
    },
  });
  
  // Store in Redis cache (short TTL for orders)
  if (order) {
    try {
      await redis.set(cacheKey, JSON.stringify(order), 'EX', CACHE_TTL);
    } catch (error) {
      console.error('Redis cache error:', error);
    }
  }
  
  return order;
});

/**
 * Get orders by customer phone number
 */
export async function getOrdersByCustomerPhone(phone: string): Promise<Order[]> {
  if (!phone) return [];
  
  const orders = await prisma.order.findMany({
    where: {
      customerPhone: phone,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  return orders;
}

/**
 * Get orders by customer ID
 */
export async function getOrdersByCustomerId(customerId: string): Promise<Order[]> {
  if (!customerId) return [];
  
  const orders = await prisma.order.findMany({
    where: {
      customerId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  return orders;
}

/**
 * Get today's orders
 */
export async function getTodayOrders(): Promise<Order[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  return orders;
}

/**
 * Create a new order
 * 
 * This function:
 * 1. Creates the order
 * 2. Updates or creates the customer record
 * 3. Updates customer's total orders and spending
 */
export async function createOrder(data: CreateOrderInput): Promise<OrderWithItems> {
  // Calculate total based on items
  const total = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Find or create customer by phone number
  let customerId: string | null = null;
  
  if (data.customerPhone) {
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: data.customerPhone },
    });
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
      
      // Update customer stats (will be done after order creation)
    } else {
      // Create new customer
      const newCustomer = await prisma.customer.create({
        data: {
          name: data.customerName,
          phone: data.customerPhone,
          totalOrders: 1,
          totalSpent: total,
          lastOrderDate: new Date(),
        },
      });
      
      customerId = newCustomer.id;
    }
  }
  
  // Create the order with items
  const order = await prisma.order.create({
    data: {
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerId,
      total,
      tableNumber: data.tableNumber,
      isTakeAway: data.isTakeAway ?? false,
      notes: data.notes,
      whatsappSent: data.whatsappSent ?? false,
      items: {
        create: data.items.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
        })),
      },
    },
    include: {
      items: {
        include: {
          menuItem: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });
  
  // Update existing customer stats if needed
  if (customerId && data.customerPhone) {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: total },
        lastOrderDate: new Date(),
      },
    });
  }
  
  // Update popular items tracking
  try {
    for (const item of data.items) {
      await prisma.popularItem.upsert({
        where: { menuItemId: item.menuItemId },
        update: {
          orderCount: { increment: item.quantity },
          lastOrdered: new Date(),
        },
        create: {
          menuItemId: item.menuItemId,
          orderCount: item.quantity,
          lastOrdered: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('Error updating popular items:', error);
    // Don't fail the order creation if this fails
  }
  
  // Invalidate any relevant caches
  try {
    // We don't cache the full orders list, but we do cache individual orders
    // and potentially customer data
    if (customerId) {
      await redis.del(`customer:${customerId}`);
    }
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return order;
}

/**
 * Update an order's status
 */
export async function updateOrderStatus({ id, status }: UpdateOrderStatusInput): Promise<Order> {
  const order = await prisma.order.update({
    where: { id },
    data: { status },
  });
  
  // Invalidate cache for this order
  try {
    await redis.del(`order:${id}`);
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return order;
}

/**
 * Update an order's payment status
 */
export async function updateOrderPaymentStatus({ id, paymentStatus }: UpdateOrderPaymentStatusInput): Promise<Order> {
  const order = await prisma.order.update({
    where: { id },
    data: { paymentStatus },
  });
  
  // Invalidate cache for this order
  try {
    await redis.del(`order:${id}`);
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return order;
}

/**
 * Mark an order as sent via WhatsApp
 */
export async function markOrderAsWhatsappSent(id: string): Promise<Order> {
  const order = await prisma.order.update({
    where: { id },
    data: { whatsappSent: true },
  });
  
  // Invalidate cache for this order
  try {
    await redis.del(`order:${id}`);
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return order;
}

/**
 * Add notes to an order
 */
export async function addOrderNotes(id: string, notes: string): Promise<Order> {
  const order = await prisma.order.update({
    where: { id },
    data: { notes },
  });
  
  // Invalidate cache for this order
  try {
    await redis.del(`order:${id}`);
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return order;
}

/**
 * Delete an order (typically only for testing or admin cleanup)
 */
export async function deleteOrder(id: string): Promise<Order> {
  // Get the order first to access customer data for updates
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      customerId: true,
      total: true,
    },
  });
  
  // Delete the order (this will cascade delete order items due to Prisma schema)
  const deletedOrder = await prisma.order.delete({
    where: { id },
  });
  
  // Update customer stats if needed
  if (order?.customerId) {
    await prisma.customer.update({
      where: { id: order.customerId },
      data: {
        totalOrders: { decrement: 1 },
        totalSpent: { decrement: order.total },
      },
    });
    
    // Invalidate customer cache
    try {
      await redis.del(`customer:${order.customerId}`);
    } catch (error) {
      console.error('Redis cache invalidation error:', error);
    }
  }
  
  // Invalidate order cache
  try {
    await redis.del(`order:${id}`);
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return deletedOrder;
}

/**
 * Get order statistics for dashboard
 */
export async function getOrderStats(period: 'today' | 'week' | 'month' | 'year' = 'today'): Promise<{
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  pendingOrders: number;
  completedOrders: number;
}> {
  // Calculate date range based on period
  const now = new Date();
  let startDate = new Date();
  
  if (period === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate.setMonth(now.getMonth() - 1);
  } else if (period === 'year') {
    startDate.setFullYear(now.getFullYear() - 1);
  }
  
  // Get orders within date range
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      total: true,
      status: true,
    },
  });
  
  // Calculate statistics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const pendingOrders = orders.filter(order => order.status === 'PENDING').length;
  const completedOrders = orders.filter(order => order.status === 'COMPLETED').length;
  
  return {
    totalOrders,
    totalRevenue,
    averageOrderValue,
    pendingOrders,
    completedOrders,
  };
}

/**
 * Get popular items from orders
 */
export async function getPopularOrderItems(limit: number = 5): Promise<{
  menuItemId: string;
  name: string;
  count: number;
  total: number;
}[]> {
  const popularItems = await prisma.$queryRaw`
    SELECT 
      "menuItemId",
      MAX("name") as name,
      SUM("quantity") as count,
      SUM("subtotal") as total
    FROM "OrderItem"
    GROUP BY "menuItemId"
    ORDER BY count DESC
    LIMIT ${limit}
  `;
  
  return popularItems as any;
}
