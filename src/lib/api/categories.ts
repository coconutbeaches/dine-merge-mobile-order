// src/lib/api/categories.ts
import { prisma } from '@/lib/db';
import { redisClient } from '@/lib/redis'; // Corrected import

// Define a type for Category, aligning with Prisma schema
interface Category {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Add any other relevant fields from your Category model
}

/**
 * Fetches all categories from the database, with caching.
 */
export async function getCategories(): Promise<Category[]> {
  const cacheKey = 'all_categories';

  try {
    // Try to get from Redis cache
    if (redisClient.status === 'ready') {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          console.log('Serving categories from cache');
          const parsedData: Category[] = JSON.parse(cachedData);
          // Ensure dates are properly handled if needed after parsing
          return parsedData.map(category => ({
            ...category,
            createdAt: new Date(category.createdAt),
            updatedAt: new Date(category.updatedAt),
          }));
        }
      } catch (cacheError) {
        console.error('Redis cache read error for categories:', cacheError);
        // Proceed to fetch from source if cache fails
      }
    } else {
      console.warn('Redis client not ready for categories, fetching from source.');
    }

    // If not in cache or Redis is not ready, fetch from database
    console.log('Fetching categories from database');
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc', // Or any other preferred order
      },
    });

    // Store in Redis cache if client is ready
    if (redisClient.status === 'ready') {
      try {
        await redisClient.set(cacheKey, JSON.stringify(categories), 'EX', 3600); // Cache for 1 hour
        console.log('Categories cached in Redis');
      } catch (cacheSetError) {
        console.error('Redis cache write error for categories:', cacheSetError);
      }
    }

    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return []; // Return empty array on error
  }
}

/**
 * Fetches a single category by its ID from the database.
 * (Example function, implement caching if needed, similar to getCategories or getMenuItemById)
 * @param id The ID of the category to fetch.
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  if (!id) {
    console.error('getCategoryById: ID is required');
    return null;
  }
  // Note: Caching for single category not implemented in this example, add if needed
  try {
    console.log(`Fetching category ${id} from database`);
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      console.warn(`Category with ID ${id} not found.`);
      return null;
    }
    return category;
  } catch (error) {
    console.error(`Error fetching category ${id}:`, error);
    return null;
  }
}
