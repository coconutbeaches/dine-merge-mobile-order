import { NextResponse } from 'next/server';
import redisClient from '@/lib/redis'; // Import the Redis client

// Define a type for recommended items for clarity
interface RecommendedItem {
  id: string;
  name: string;
  price: number;
  image: string;
}

// Placeholder for fetching recommendations from a database or a more complex source
async function fetchRecommendationsFromSource(): Promise<RecommendedItem[]> {
  // In a real application, this would query your database or a recommendation engine
  // For this example, we'll return static mock data
  return [
    { id: 'rec1', name: 'Special Fried Rice', price: 120, image: '/placeholder-food1.png' },
    { id: 'rec2', name: 'Pad Thai Goong', price: 150, image: '/placeholder-food2.png' },
    { id: 'rec3', name: 'Green Curry Chicken', price: 180, image: '/placeholder-food3.png' },
  ];
}

export async function GET() {
  try {
    const cacheKey = 'recommended_items';
    let recommendedItems: RecommendedItem[] | null = null;

    // Try to get from Redis cache
    if (redisClient.status === 'ready') {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          recommendedItems = JSON.parse(cachedData) as RecommendedItem[];
          console.log('Serving recommendations from cache');
        }
      } catch (cacheError) {
        console.error('Redis cache read error:', cacheError);
        // Proceed to fetch from source if cache fails
      }
    } else {
      console.warn('Redis client not ready, fetching from source.');
    }
    

    if (!recommendedItems) {
      console.log('Fetching recommendations from source');
      recommendedItems = await fetchRecommendationsFromSource();
      
      // Store in Redis cache if client is ready
      if (redisClient.status === 'ready' && recommendedItems) {
        try {
          await redisClient.set(cacheKey, JSON.stringify(recommendedItems), 'EX', 3600); // Cache for 1 hour
          console.log('Recommendations cached in Redis');
        } catch (cacheSetError) {
          console.error('Redis cache write error:', cacheSetError);
        }
      }
    }

    if (!recommendedItems) {
      // This case should ideally not be hit if fetchRecommendationsFromSource always returns data
      // or throws an error that's caught.
      return NextResponse.json({ error: 'No recommendations found' }, { status: 404 });
    }

    return NextResponse.json(recommendedItems);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}
