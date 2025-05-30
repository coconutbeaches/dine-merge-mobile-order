import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // Correctly a named import
import redisClient from '@/lib/redis'; // Changed to default import

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  image?: string | null;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
  options: any[]; // Define more specific type if options structure is known
  isPopular: boolean;
  isNew: boolean;
  availability: string; // e.g., 'AVAILABLE', 'SOLD_OUT'
}

interface CategoryWithMenuItems {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  menuItems: MenuItem[];
}

export async function GET() {
  const cacheKey = 'all_menu_items_grouped';

  try {
    // Try to get from Redis cache
    if (redisClient.status === 'ready') {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          console.log('Serving all menu items from cache');
          const parsedData: CategoryWithMenuItems[] = JSON.parse(cachedData);
          return NextResponse.json(parsedData);
        }
      } catch (cacheError) {
        console.error('Redis cache read error for all_menu_items_grouped:', cacheError);
        // Proceed to fetch from source if cache fails, do not return error yet
      }
    } else {
      console.warn('Redis client not ready for all_menu_items_grouped, fetching from source.');
    }

    // If not in cache or Redis is not ready, fetch from database
    console.log('Fetching all menu items from database');
    const categoriesWithItems = await prisma.category.findMany({
      include: {
        menuItems: {
          orderBy: {
            name: 'asc', // Or any other preferred order, e.g., displayOrder
          },
        },
      },
      orderBy: {
        name: 'asc', // Order categories by name
      },
    });

    // Store in Redis cache if client is ready
    if (redisClient.status === 'ready') {
      try {
        await redisClient.set(cacheKey, JSON.stringify(categoriesWithItems), 'EX', 3600); // Cache for 1 hour
        console.log('All menu items cached in Redis');
      } catch (cacheSetError) {
        console.error('Redis cache write error for all_menu_items_grouped:', cacheSetError);
      }
    }

    return NextResponse.json(categoriesWithItems);
  } catch (error) {
    console.error('Error fetching all menu items:', error);
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
  }
}
