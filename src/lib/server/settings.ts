// src/lib/server/settings.ts

import { prisma } from '@/lib/db';
import { isRedisAvailable, redisClient } from '@/lib/redis';

export interface RestaurantSettings {
  restaurantName: string | null;
  restaurantWhatsApp: string | null;
  // Add other settings as needed
}

/**
 * Updates a specific setting in the database and invalidates its cache in Redis.
 * This function is intended for server-side use only.
 * @param key The key of the setting to update.
 * @param value The new value for the setting.
 * @returns True if the setting was updated successfully, false otherwise.
 */
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

/**
 * Retrieves all settings from the database.
 * NOTE: This is a placeholder if direct DB access for all settings is needed on the server.
 * Typically, settings are fetched via API routes that handle caching.
 * This function does NOT implement caching itself.
 * @returns {Promise<RestaurantSettings | null>}
 */
export async function getAllSettingsFromDB(): Promise<RestaurantSettings | null> {
    try {
        const settingsFromDB = await prisma.setting.findMany();
        if (!settingsFromDB) return null;

        const settings: Partial<RestaurantSettings> = {};
        settingsFromDB.forEach(setting => {
            if (setting.key === 'restaurantName') {
                settings.restaurantName = setting.value;
            } else if (setting.key === 'restaurantWhatsApp') {
                settings.restaurantWhatsApp = setting.value;
            }
            // Add other settings as needed
        });
        return settings as RestaurantSettings;
    } catch (error) {
        console.error('Error fetching all settings directly from DB:', error);
        return null;
    }
}
