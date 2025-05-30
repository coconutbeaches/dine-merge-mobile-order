import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redisClient, isRedisAvailable } from '@/lib/redis';

const RESTAURANT_NAME_KEY = 'setting_restaurant_name';
const RESTAURANT_WHATSAPP_KEY = 'setting_restaurant_whatsapp';
const ALL_SETTINGS_KEY = 'all_restaurant_settings'; // Cache key for the combined settings object

interface RestaurantSettings {
  restaurantName: string | null;
  restaurantWhatsApp: string | null;
}

/**
 * API route to fetch all relevant restaurant settings.
 * This route handles caching and database access.
 */
export async function GET() {
  try {
    let settings: RestaurantSettings | null = null;

    // Try to get from Redis cache
    if (isRedisAvailable()) {
      try {
        const cachedData = await redisClient.get(ALL_SETTINGS_KEY);
        if (cachedData) {
          settings = JSON.parse(cachedData) as RestaurantSettings;
          console.log('Serving restaurant settings from cache');
          return NextResponse.json(settings);
        }
      } catch (cacheError) {
        console.error('Redis cache read error for restaurant settings:', cacheError);
        // Proceed to fetch from database if cache read fails
      }
    } else {
      console.warn('Redis client not ready for restaurant settings, fetching from database.');
    }

    // If not in cache or Redis is not available, fetch from database
    console.log('Fetching restaurant settings from database');
    const dbSettings = await prisma.setting.findMany({
      where: {
        key: {
          in: [RESTAURANT_NAME_KEY, RESTAURANT_WHATSAPP_KEY],
        },
      },
    });

    const restaurantNameSetting = dbSettings.find(s => s.key === RESTAURANT_NAME_KEY);
    const restaurantWhatsAppSetting = dbSettings.find(s => s.key === RESTAURANT_WHATSAPP_KEY);

    settings = {
      restaurantName: restaurantNameSetting?.value || null,
      restaurantWhatsApp: restaurantWhatsAppSetting?.value || null,
    };

    // Store in Redis cache if client is ready and settings were found
    if (isRedisAvailable() && (settings.restaurantName || settings.restaurantWhatsApp)) {
      try {
        await redisClient.set(ALL_SETTINGS_KEY, JSON.stringify(settings), 'EX', 3600 * 24); // Cache for 24 hours
        console.log('Restaurant settings cached in Redis');
      } catch (cacheSetError) {
        console.error('Redis cache write error for restaurant settings:', cacheSetError);
      }
    }

    if (settings.restaurantName === null && settings.restaurantWhatsApp === null) {
      // If no settings are found at all, it's a 404.
      // If some are found but not others, that's fine, the object will reflect that.
      const dbIsEmpty = await prisma.setting.count({
        where: { key: { in: [RESTAURANT_NAME_KEY, RESTAURANT_WHATSAPP_KEY] } }
      });
      if(dbIsEmpty === 0) {
        return NextResponse.json({ error: 'Restaurant settings not configured' }, { status: 404 });
      }
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching restaurant settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch restaurant settings', details: errorMessage }, { status: 500 });
  }
}
