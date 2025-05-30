import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // Changed to named import
import { redisClient } from '@/lib/redis'; // Changed to named import

// Define a more specific type for a single MenuItem, aligning with Prisma schema
interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  image?: string | null;
  categoryId: string;
  // Assuming options might be complex, using 'any' for now, but could be more specific
  // e.g., options: Array<{ name: string; choices: Array<{ name: string; priceModifier?: number }> }>;
  options: any[]; 
  isPopular: boolean;
  isNew: boolean;
  availability: string; // e.g., 'AVAILABLE', 'SOLD_OUT'
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(
  request: Request, // First parameter is Request
  { params }: { params: { id: string } } // Second parameter is an object with params
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Menu item ID is required' }, { status: 400 });
  }

  const cacheKey = `menu_item_${id}`;

  try {
    // Try to get from Redis cache
    if (redisClient.status === 'ready') {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          console.log(`Serving menu item ${id} from cache`);
          const parsedData: MenuItem = JSON.parse(cachedData);
          return NextResponse.json(parsedData);
        }
      } catch (cacheError) {
        console.error(`Redis cache read error for menu_item_${id}:`, cacheError);
        // Proceed to fetch from source if cache fails
      }
    } else {
      console.warn(`Redis client not ready for menu_item_${id}, fetching from source.`);
    }

    // If not in cache or Redis is not ready, fetch from database
    console.log(`Fetching menu item ${id} from database`);
    const menuItem = await prisma.menuItem.findUnique({
      where: { id },
      // include: { options: true } // Example: if you have a relation for options
    });

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Store in Redis cache if client is ready
    if (redisClient.status === 'ready') {
      try {
        await redisClient.set(cacheKey, JSON.stringify(menuItem), 'EX', 3600); // Cache for 1 hour
        console.log(`Menu item ${id} cached in Redis`);
      } catch (cacheSetError) {
        console.error(`Redis cache write error for menu_item_${id}:`, cacheSetError);
      }
    }

    return NextResponse.json(menuItem);
  } catch (error) {
    console.error(`Error fetching menu item ${id}:`, error);
    // Check if the error is a Prisma-specific error for not found, though findUnique returns null
    // if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    //   return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    // }
    return NextResponse.json({ error: 'Failed to fetch menu item' }, { status: 500 });
  }
}
