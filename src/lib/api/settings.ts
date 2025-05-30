// src/lib/api/settings.ts

export interface RestaurantSettings {
  restaurantName: string | null;
  restaurantWhatsApp: string | null;
  // Add other settings as needed
}

/**
 * Fetches all relevant restaurant settings from the API route.
 * The API route `/api/settings` handles caching and database access internally.
 */
export async function getRestaurantSettings(): Promise<RestaurantSettings | null> {
  try {
    const response = await fetch('/api/settings');

    if (!response.ok) {
      console.error('Failed to fetch restaurant settings:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    // Basic validation that data is an object and not an error response
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        console.error('Fetched restaurant settings data is not a valid object:', data);
        return null;
    }
    if (data.error) { // Handle cases where API returns a JSON error object
        console.error('API error for restaurant settings:', data.error);
        return null;
    }

    return data as RestaurantSettings;
  } catch (error) {
    console.error('Error fetching restaurant settings:', error);
    return null;
  }
}

/**
 * Fetches the restaurant name by calling getRestaurantSettings.
 */
export async function getRestaurantName(): Promise<string | null> {
  try {
    const settings = await getRestaurantSettings();
    return settings?.restaurantName || null;
  } catch (error) {
    console.error('Error fetching restaurant name:', error);
    return null;
  }
}

/**
 * Fetches the restaurant WhatsApp number by calling getRestaurantSettings.
 */
export async function getRestaurantWhatsAppNumber(): Promise<string | null> {
  try {
    const settings = await getRestaurantSettings();
    return settings?.restaurantWhatsApp || null;
  } catch (error) {
    console.error('Error fetching restaurant WhatsApp number:', error);
    return null;
  }
}

// The updateSetting function can remain as it directly interacts with Prisma
// and is assumed to be called from a server-side context (e.g., an admin API route).
// If this function were ever called from a client component, it would also need
// to be refactored into its own API route.
// For now, keeping it as is, assuming its usage is server-side.
// Example function to update a setting (ensure proper admin rights for this in a real app)
import { prisma } from '@/lib/db';
import { isRedisAvailable, redisClient } from '@/lib/redis';

export async function updateSetting(key: string, value: string): Promise<boolean> {
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    // Invalidate cache for this setting
    if (isRedisAvailable()) {
      await redisClient.del(key); // Assuming cache key matches setting key
      console.log(`Cache for setting ${key} invalidated after update.`);
    }
    return true;
  } catch (error) {
    console.error(`Error updating setting ${key}:`, error);
    return false;
  }
}
