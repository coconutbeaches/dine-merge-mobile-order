import { prisma } from '@/lib/db';
import { MenuItem } from '@prisma/client';
import { cache } from 'react';
import { redis } from '@/lib/redis';

// Types
export type MenuItemWithCategory = MenuItem & {
  category: {
    id: string;
    name: string;
    nameEn?: string | null;
  };
};

export type CreateMenuItemInput = {
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  image?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  categoryId: string;
};

export type UpdateMenuItemInput = Partial<CreateMenuItemInput> & {
  id: string;
};

// Cache duration in seconds
const CACHE_TTL = 60 * 60; // 1 hour

/**
 * Get all menu items
 * 
 * Cached with React cache() for server components
 * Also cached in Redis for API routes
 */
export const getMenuItems = cache(async (options?: {
  includeInactive?: boolean;
  categoryId?: string;
}): Promise<MenuItem[]> => {
  const { includeInactive = false, categoryId } = options || {};
  
  const cacheKey = `menu-items:all:${includeInactive}:${categoryId || 'all'}`;
  
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
  const menuItems = await prisma.menuItem.findMany({
    where: {
      isActive: includeInactive ? undefined : true,
      categoryId: categoryId ? categoryId : undefined,
    },
    orderBy: [
      {
        category: {
          order: 'asc',
        },
      },
      {
        name: 'asc',
      },
    ],
  });
  
  // Store in Redis cache
  try {
    await redis.set(cacheKey, JSON.stringify(menuItems), 'EX', CACHE_TTL);
  } catch (error) {
    console.error('Redis cache error:', error);
  }
  
  return menuItems;
});

/**
 * Get menu items with their categories
 */
export const getMenuItemsWithCategories = cache(async (): Promise<MenuItemWithCategory[]> => {
  const cacheKey = 'menu-items:with-categories';
  
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
  const menuItems = await prisma.menuItem.findMany({
    where: {
      isActive: true,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          nameEn: true,
        },
      },
    },
    orderBy: [
      {
        category: {
          order: 'asc',
        },
      },
      {
        name: 'asc',
      },
    ],
  });
  
  // Store in Redis cache
  try {
    await redis.set(cacheKey, JSON.stringify(menuItems), 'EX', CACHE_TTL);
  } catch (error) {
    console.error('Redis cache error:', error);
  }
  
  return menuItems;
});

/**
 * Get a menu item by ID
 */
export const getMenuItem = cache(async (id: string): Promise<MenuItem | null> => {
  if (!id) return null;
  
  const cacheKey = `menu-item:${id}`;
  
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
  const menuItem = await prisma.menuItem.findUnique({
    where: { id },
  });
  
  // Store in Redis cache
  if (menuItem) {
    try {
      await redis.set(cacheKey, JSON.stringify(menuItem), 'EX', CACHE_TTL);
    } catch (error) {
      console.error('Redis cache error:', error);
    }
  }
  
  return menuItem;
});

/**
 * Get a menu item by ID with category
 */
export const getMenuItemWithCategory = cache(async (id: string): Promise<MenuItemWithCategory | null> => {
  if (!id) return null;
  
  const cacheKey = `menu-item:${id}:with-category`;
  
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
  const menuItem = await prisma.menuItem.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          nameEn: true,
        },
      },
    },
  });
  
  // Store in Redis cache
  if (menuItem) {
    try {
      await redis.set(cacheKey, JSON.stringify(menuItem), 'EX', CACHE_TTL);
    } catch (error) {
      console.error('Redis cache error:', error);
    }
  }
  
  return menuItem;
});

/**
 * Create a new menu item
 */
export async function createMenuItem(data: CreateMenuItemInput): Promise<MenuItem> {
  const menuItem = await prisma.menuItem.create({
    data: {
      name: data.name,
      nameEn: data.nameEn,
      description: data.description,
      descriptionEn: data.descriptionEn,
      price: data.price,
      image: data.image,
      isActive: data.isActive ?? true,
      isAvailable: data.isAvailable ?? true,
      categoryId: data.categoryId,
    },
  });
  
  // Invalidate caches
  try {
    await redis.del('menu-items:all:true:all');
    await redis.del('menu-items:all:false:all');
    await redis.del(`menu-items:all:true:${data.categoryId}`);
    await redis.del(`menu-items:all:false:${data.categoryId}`);
    await redis.del('menu-items:with-categories');
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return menuItem;
}

/**
 * Update a menu item
 */
export async function updateMenuItem(data: UpdateMenuItemInput): Promise<MenuItem> {
  const { id, ...updateData } = data;
  
  const menuItem = await prisma.menuItem.update({
    where: { id },
    data: updateData,
  });
  
  // Invalidate caches
  try {
    await redis.del(`menu-item:${id}`);
    await redis.del(`menu-item:${id}:with-category`);
    await redis.del('menu-items:all:true:all');
    await redis.del('menu-items:all:false:all');
    await redis.del(`menu-items:all:true:${menuItem.categoryId}`);
    await redis.del(`menu-items:all:false:${menuItem.categoryId}`);
    await redis.del('menu-items:with-categories');
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return menuItem;
}

/**
 * Delete a menu item
 */
export async function deleteMenuItem(id: string): Promise<MenuItem> {
  // Get the item first to know its categoryId for cache invalidation
  const menuItem = await prisma.menuItem.findUnique({
    where: { id },
    select: { categoryId: true },
  });
  
  // Delete the item
  const deletedItem = await prisma.menuItem.delete({
    where: { id },
  });
  
  // Invalidate caches
  try {
    await redis.del(`menu-item:${id}`);
    await redis.del(`menu-item:${id}:with-category`);
    await redis.del('menu-items:all:true:all');
    await redis.del('menu-items:all:false:all');
    if (menuItem) {
      await redis.del(`menu-items:all:true:${menuItem.categoryId}`);
      await redis.del(`menu-items:all:false:${menuItem.categoryId}`);
    }
    await redis.del('menu-items:with-categories');
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return deletedItem;
}

/**
 * Mark a menu item as available/unavailable
 */
export async function toggleMenuItemAvailability(id: string, isAvailable: boolean): Promise<MenuItem> {
  const menuItem = await prisma.menuItem.update({
    where: { id },
    data: { isAvailable },
  });
  
  // Invalidate caches
  try {
    await redis.del(`menu-item:${id}`);
    await redis.del(`menu-item:${id}:with-category`);
    await redis.del('menu-items:all:true:all');
    await redis.del('menu-items:all:false:all');
    await redis.del(`menu-items:all:true:${menuItem.categoryId}`);
    await redis.del(`menu-items:all:false:${menuItem.categoryId}`);
    await redis.del('menu-items:with-categories');
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return menuItem;
}

/**
 * Get popular menu items based on order count
 */
export const getPopularMenuItems = cache(async (limit: number = 10): Promise<MenuItem[]> => {
  const cacheKey = `menu-items:popular:${limit}`;
  
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
  const popularItems = await prisma.$queryRaw<MenuItem[]>`
    SELECT m.* 
    FROM "MenuItem" m
    JOIN (
      SELECT "menuItemId", COUNT(*) as order_count
      FROM "OrderItem"
      GROUP BY "menuItemId"
      ORDER BY order_count DESC
      LIMIT ${limit}
    ) o ON m.id = o."menuItemId"
    WHERE m."isActive" = true AND m."isAvailable" = true
    ORDER BY o.order_count DESC
  `;
  
  // Store in Redis cache
  try {
    await redis.set(cacheKey, JSON.stringify(popularItems), 'EX', CACHE_TTL);
  } catch (error) {
    console.error('Redis cache error:', error);
  }
  
  return popularItems;
});

/**
 * Search menu items by name or description
 */
export async function searchMenuItems(query: string): Promise<MenuItem[]> {
  if (!query || query.trim() === '') {
    return [];
  }
  
  const searchTerm = `%${query.trim()}%`;
  
  const menuItems = await prisma.$queryRaw<MenuItem[]>`
    SELECT * FROM "MenuItem"
    WHERE 
      "isActive" = true AND
      (
        "name" ILIKE ${searchTerm} OR
        "nameEn" ILIKE ${searchTerm} OR
        "description" ILIKE ${searchTerm} OR
        "descriptionEn" ILIKE ${searchTerm}
      )
    ORDER BY "name" ASC
    LIMIT 20
  `;
  
  return menuItems;
}
