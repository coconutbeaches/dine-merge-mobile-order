import { prisma } from '@/lib/db';
import { Category } from '@prisma/client';
import { cache } from 'react';
import { redis } from '@/lib/redis';

// Types
export type CategoryWithItemCount = Category & {
  _count: {
    items: number;
  };
};

export type CreateCategoryInput = {
  name: string;
  nameEn?: string;
  image?: string;
  order?: number;
  isActive?: boolean;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput> & {
  id: string;
};

// Cache duration in seconds
const CACHE_TTL = 60 * 60; // 1 hour

/**
 * Get all categories
 * 
 * Cached with React cache() for server components
 * Also cached in Redis for API routes
 */
export const getCategories = cache(async (options?: {
  includeInactive?: boolean;
  includeItemCount?: boolean;
}): Promise<Category[] | CategoryWithItemCount[]> => {
  const { includeInactive = false, includeItemCount = false } = options || {};
  
  const cacheKey = `categories:all:${includeInactive}:${includeItemCount}`;
  
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
  const categories = await prisma.category.findMany({
    where: {
      isActive: includeInactive ? undefined : true,
    },
    ...(includeItemCount ? {
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    } : {}),
    orderBy: {
      order: 'asc',
    },
  });
  
  // Store in Redis cache
  try {
    await redis.set(cacheKey, JSON.stringify(categories), 'EX', CACHE_TTL);
  } catch (error) {
    console.error('Redis cache error:', error);
  }
  
  return categories;
});

/**
 * Get a category by ID
 */
export const getCategory = cache(async (id: string): Promise<Category | null> => {
  if (!id) return null;
  
  const cacheKey = `category:${id}`;
  
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
  const category = await prisma.category.findUnique({
    where: { id },
  });
  
  // Store in Redis cache
  if (category) {
    try {
      await redis.set(cacheKey, JSON.stringify(category), 'EX', CACHE_TTL);
    } catch (error) {
      console.error('Redis cache error:', error);
    }
  }
  
  return category;
});

/**
 * Get a category by ID with item count
 */
export const getCategoryWithItemCount = cache(async (id: string): Promise<CategoryWithItemCount | null> => {
  if (!id) return null;
  
  const cacheKey = `category:${id}:with-item-count`;
  
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
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          items: true,
        },
      },
    },
  });
  
  // Store in Redis cache
  if (category) {
    try {
      await redis.set(cacheKey, JSON.stringify(category), 'EX', CACHE_TTL);
    } catch (error) {
      console.error('Redis cache error:', error);
    }
  }
  
  return category;
});

/**
 * Create a new category
 */
export async function createCategory(data: CreateCategoryInput): Promise<Category> {
  // Get the highest order value to place new category at the end
  const highestOrder = await prisma.category.findFirst({
    orderBy: {
      order: 'desc',
    },
    select: {
      order: true,
    },
  });
  
  const nextOrder = (highestOrder?.order || 0) + 1;
  
  const category = await prisma.category.create({
    data: {
      name: data.name,
      nameEn: data.nameEn,
      image: data.image,
      order: data.order ?? nextOrder,
      isActive: data.isActive ?? true,
    },
  });
  
  // Invalidate caches
  try {
    await redis.del('categories:all:true:true');
    await redis.del('categories:all:true:false');
    await redis.del('categories:all:false:true');
    await redis.del('categories:all:false:false');
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return category;
}

/**
 * Update a category
 */
export async function updateCategory(data: UpdateCategoryInput): Promise<Category> {
  const { id, ...updateData } = data;
  
  const category = await prisma.category.update({
    where: { id },
    data: updateData,
  });
  
  // Invalidate caches
  try {
    await redis.del(`category:${id}`);
    await redis.del(`category:${id}:with-item-count`);
    await redis.del('categories:all:true:true');
    await redis.del('categories:all:true:false');
    await redis.del('categories:all:false:true');
    await redis.del('categories:all:false:false');
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return category;
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<Category> {
  // Check if category has menu items
  const categoryWithItems = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          items: true,
        },
      },
    },
  });
  
  if (categoryWithItems?._count.items && categoryWithItems._count.items > 0) {
    throw new Error('Cannot delete category with menu items');
  }
  
  const category = await prisma.category.delete({
    where: { id },
  });
  
  // Invalidate caches
  try {
    await redis.del(`category:${id}`);
    await redis.del(`category:${id}:with-item-count`);
    await redis.del('categories:all:true:true');
    await redis.del('categories:all:true:false');
    await redis.del('categories:all:false:true');
    await redis.del('categories:all:false:false');
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return category;
}

/**
 * Reorder categories
 * 
 * @param categoryIds - Array of category IDs in the desired order
 */
export async function reorderCategories(categoryIds: string[]): Promise<Category[]> {
  // Update each category with its new order
  const updatePromises = categoryIds.map((id, index) => {
    return prisma.category.update({
      where: { id },
      data: { order: index },
    });
  });
  
  const categories = await prisma.$transaction(updatePromises);
  
  // Invalidate caches
  try {
    categoryIds.forEach(id => {
      redis.del(`category:${id}`);
      redis.del(`category:${id}:with-item-count`);
    });
    
    await redis.del('categories:all:true:true');
    await redis.del('categories:all:true:false');
    await redis.del('categories:all:false:true');
    await redis.del('categories:all:false:false');
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return categories;
}

/**
 * Toggle category active status
 */
export async function toggleCategoryActive(id: string, isActive: boolean): Promise<Category> {
  const category = await prisma.category.update({
    where: { id },
    data: { isActive },
  });
  
  // Invalidate caches
  try {
    await redis.del(`category:${id}`);
    await redis.del(`category:${id}:with-item-count`);
    await redis.del('categories:all:true:true');
    await redis.del('categories:all:true:false');
    await redis.del('categories:all:false:true');
    await redis.del('categories:all:false:false');
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return category;
}
