import { prisma } from '@/lib/db';
import { MenuItem } from '@prisma/client';
import { cache } from 'react';
import { redis } from '@/lib/redis';
import { getPopularMenuItems } from './menu-items';

// Types
export type RecommendationSource = 'popular' | 'frequently_bought_together' | 'seasonal' | 'customer_history';

export type RecommendationItem = MenuItem & {
  recommendationReason?: string;
  score?: number;
};

export type RecommendationOptions = {
  excludeIds?: string[];
  categoryId?: string;
  customerId?: string;
  currentCartItems?: string[];
  limit?: number;
  source?: RecommendationSource | RecommendationSource[];
};

// Cache duration in seconds
const CACHE_TTL = 60 * 30; // 30 minutes

/**
 * Get recommended items for a customer
 * 
 * Cached with React cache() for server components
 * Combines multiple recommendation sources with fallbacks
 */
export const getRecommendedItems = cache(async (
  limit: number = 4,
  options?: RecommendationOptions
): Promise<RecommendationItem[]> => {
  const {
    excludeIds = [],
    categoryId,
    customerId,
    currentCartItems = [],
    source = ['frequently_bought_together', 'popular', 'seasonal'],
  } = options || {};
  
  // Combine current cart items with explicitly excluded IDs
  const allExcludedIds = [...new Set([...excludeIds, ...currentCartItems])];
  
  // Generate cache key based on parameters
  const cacheKey = `recommendations:${limit}:${allExcludedIds.join(',')}:${categoryId || ''}:${customerId || ''}:${Array.isArray(source) ? source.join(',') : source}`;
  
  // Try to get from Redis cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Redis cache error:', error);
  }
  
  // Try each recommendation source in order until we have enough items
  let recommendations: RecommendationItem[] = [];
  const sources = Array.isArray(source) ? source : [source];
  
  // Process each source until we have enough recommendations
  for (const src of sources) {
    if (recommendations.length >= limit) break;
    
    const neededCount = limit - recommendations.length;
    let sourceRecommendations: RecommendationItem[] = [];
    
    switch (src) {
      case 'frequently_bought_together':
        if (currentCartItems.length > 0) {
          sourceRecommendations = await getFrequentlyBoughtTogether(
            currentCartItems,
            neededCount,
            allExcludedIds
          );
        }
        break;
        
      case 'customer_history':
        if (customerId) {
          sourceRecommendations = await getCustomerBasedRecommendations(
            customerId,
            neededCount,
            allExcludedIds
          );
        }
        break;
        
      case 'seasonal':
        sourceRecommendations = await getSeasonalRecommendations(
          neededCount, 
          allExcludedIds,
          categoryId
        );
        break;
        
      case 'popular':
      default:
        // Default to popular items if other methods don't yield enough results
        sourceRecommendations = await getPopularItemRecommendations(
          neededCount,
          allExcludedIds,
          categoryId
        );
        break;
    }
    
    // Add recommendations from this source, avoiding duplicates
    const existingIds = recommendations.map(item => item.id);
    const newRecommendations = sourceRecommendations.filter(
      item => !existingIds.includes(item.id)
    );
    
    recommendations = [...recommendations, ...newRecommendations];
  }
  
  // If we still don't have enough recommendations, fall back to random items
  if (recommendations.length < limit) {
    const existingIds = recommendations.map(item => item.id);
    const randomItems = await getRandomItems(
      limit - recommendations.length,
      [...allExcludedIds, ...existingIds],
      categoryId
    );
    
    recommendations = [...recommendations, ...randomItems];
  }
  
  // Store in Redis cache
  try {
    await redis.set(cacheKey, JSON.stringify(recommendations), 'EX', CACHE_TTL);
  } catch (error) {
    console.error('Redis cache error:', error);
  }
  
  return recommendations;
});

/**
 * Get items frequently bought together with the items in cart
 */
async function getFrequentlyBoughtTogether(
  cartItemIds: string[],
  limit: number,
  excludeIds: string[] = []
): Promise<RecommendationItem[]> {
  if (!cartItemIds.length) return [];
  
  // Find items that are frequently ordered together with the items in cart
  const frequentlyBoughtItems = await prisma.$queryRaw<(RecommendationItem & { frequency: number })[]>`
    SELECT m.*, COUNT(*) as frequency
    FROM "OrderItem" oi1
    JOIN "OrderItem" oi2 ON oi1."orderId" = oi2."orderId" AND oi1."menuItemId" != oi2."menuItemId"
    JOIN "MenuItem" m ON oi2."menuItemId" = m.id
    WHERE oi1."menuItemId" IN (${cartItemIds.join(',')})
    AND m.id NOT IN (${excludeIds.join(',')})
    AND m."isActive" = true
    AND m."isAvailable" = true
    GROUP BY m.id
    ORDER BY frequency DESC
    LIMIT ${limit}
  `;
  
  return frequentlyBoughtItems.map(item => ({
    ...item,
    recommendationReason: 'Frequently bought together',
    score: item.frequency,
  }));
}

/**
 * Get recommendations based on customer's order history
 */
async function getCustomerBasedRecommendations(
  customerId: string,
  limit: number,
  excludeIds: string[] = []
): Promise<RecommendationItem[]> {
  // Find items the customer has ordered before
  const customerItems = await prisma.$queryRaw<(RecommendationItem & { orderCount: number })[]>`
    SELECT m.*, COUNT(*) as "orderCount"
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    JOIN "MenuItem" m ON oi."menuItemId" = m.id
    WHERE o."customerId" = ${customerId}
    AND m.id NOT IN (${excludeIds.join(',')})
    AND m."isActive" = true
    AND m."isAvailable" = true
    GROUP BY m.id
    ORDER BY "orderCount" DESC
    LIMIT ${limit}
  `;
  
  return customerItems.map(item => ({
    ...item,
    recommendationReason: 'Based on your previous orders',
    score: item.orderCount,
  }));
}

/**
 * Get seasonal recommendations
 * 
 * This is a placeholder implementation - in a real system, you might
 * have a separate table for seasonal items or promotions
 */
async function getSeasonalRecommendations(
  limit: number,
  excludeIds: string[] = [],
  categoryId?: string
): Promise<RecommendationItem[]> {
  // For this implementation, we'll just get random items and label them as seasonal
  // In a real system, you would have a more sophisticated approach
  const now = new Date();
  const month = now.getMonth();
  let seasonalCategory = '';
  let seasonName = '';
  
  // Simple seasonal logic based on month
  if (month >= 2 && month <= 4) {
    // Spring (March-May)
    seasonName = 'Spring';
    seasonalCategory = 'Fruit Shake'; // Example category
  } else if (month >= 5 && month <= 7) {
    // Summer (June-August)
    seasonName = 'Summer';
    seasonalCategory = 'Beer'; // Example category
  } else if (month >= 8 && month <= 10) {
    // Fall (September-November)
    seasonName = 'Fall';
    seasonalCategory = 'Coffee'; // Example category
  } else {
    // Winter (December-February)
    seasonName = 'Winter';
    seasonalCategory = 'Hot Drinks'; // Example category
  }
  
  // Query for items in the seasonal category
  const seasonalItems = await prisma.menuItem.findMany({
    where: {
      id: { notIn: excludeIds },
      isActive: true,
      isAvailable: true,
      category: {
        name: { contains: seasonalCategory },
      },
      ...(categoryId ? { categoryId } : {}),
    },
    take: limit,
  });
  
  return seasonalItems.map(item => ({
    ...item,
    recommendationReason: `${seasonName} favorite`,
  }));
}

/**
 * Get popular item recommendations
 */
async function getPopularItemRecommendations(
  limit: number,
  excludeIds: string[] = [],
  categoryId?: string
): Promise<RecommendationItem[]> {
  // Use the existing getPopularMenuItems function
  const popularItems = await getPopularMenuItems(limit * 2); // Get more than needed to account for filtering
  
  // Filter out excluded items
  const filteredItems = popularItems
    .filter(item => !excludeIds.includes(item.id))
    .filter(item => !categoryId || item.categoryId === categoryId)
    .slice(0, limit);
  
  return filteredItems.map(item => ({
    ...item,
    recommendationReason: 'Popular choice',
  }));
}

/**
 * Get random items as a fallback
 */
async function getRandomItems(
  limit: number,
  excludeIds: string[] = [],
  categoryId?: string
): Promise<RecommendationItem[]> {
  const randomItems = await prisma.menuItem.findMany({
    where: {
      id: { notIn: excludeIds },
      isActive: true,
      isAvailable: true,
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: {
      // Use a random ordering approach
      id: 'asc', // This isn't truly random, but works for small datasets
    },
    take: limit,
  });
  
  return randomItems.map(item => ({
    ...item,
    recommendationReason: 'You might also like',
  }));
}

/**
 * Get "People also bought" recommendations specifically for cart page
 * 
 * This is a convenience wrapper around getRecommendedItems
 */
export const getPeopleAlsoBought = cache(async (
  cartItemIds: string[],
  limit: number = 4
): Promise<RecommendationItem[]> => {
  return getRecommendedItems(limit, {
    currentCartItems: cartItemIds,
    source: ['frequently_bought_together', 'popular'],
  });
});

/**
 * Get personalized recommendations for a customer
 * 
 * This is a convenience wrapper around getRecommendedItems
 */
export const getPersonalizedRecommendations = cache(async (
  customerId: string,
  limit: number = 4
): Promise<RecommendationItem[]> => {
  return getRecommendedItems(limit, {
    customerId,
    source: ['customer_history', 'popular'],
  });
});

/**
 * Invalidate recommendation caches
 * 
 * Call this when orders or menu items change
 */
export async function invalidateRecommendationCaches(): Promise<void> {
  try {
    const keys = await redis.keys('recommendations:*');
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    console.error('Error invalidating recommendation caches:', error);
  }
}
