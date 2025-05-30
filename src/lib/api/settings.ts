// src/lib/api/settings.ts
import { prisma } from '@/lib/db';
import { redisClient } from '@/lib/redis'; // Corrected import to use redisClient

interface RestaurantSettings {
  restaurantName?: string | null;
  restaurantWhatsApp?: string | null;
  // Add other settings as needed
}

const RESTAURANT_NAME_KEY = 'setting_restaurant_name';
const RESTAURANT_WHATSAPP_KEY = 'setting_restaurant_whatsapp';

/**
 * Fetches the restaurant name from cache or database.
 */
export async function getRestaurantName(): Promise<string | null> {
  try {
    if (redisClient.status === 'ready') {
      const cachedName = await redisClient.get(RESTAURANT_NAME_KEY);
      if (cachedName) {
        console.log('Serving restaurant name from cache');
        return cachedName;
      }
    } else {
      console.warn('Redis client not ready for getRestaurantName, fetching from source.');
    }

    console.log('Fetching restaurant name from database');
    // Assuming you have a way to store this, e.g., a specific table or a general settings table
    // For simplicity, let's assume a 'Settings' table with a key-value structure or a dedicated table
    // This is a placeholder, adjust according to your actual schema for settings
    const setting = await prisma.setting.findUnique({
      where: { key: RESTAURANT_NAME_KEY },
    });

    const restaurantName = setting?.value || null;

    if (restaurantName && redisClient.status === 'ready') {
      await redisClient.set(RESTAURANT_NAME_KEY, restaurantName, 'EX', 3600 * 24); // Cache for 24 hours
      console.log('Restaurant name cached in Redis');
    }
    return restaurantName;
  } catch (error) {
    console.error('Error fetching restaurant name:', error);
    return null; // Fallback or default if not found/error
  }
}

/**
 * Fetches the restaurant WhatsApp number from cache or database.
 */
export async function getRestaurantWhatsAppNumber(): Promise<string | null> {
  try {
    if (redisClient.status === 'ready') {
      const cachedNumber = await redisClient.get(RESTAURANT_WHATSAPP_KEY);
      if (cachedNumber) {
        console.log('Serving restaurant WhatsApp number from cache');
        return cachedNumber;
      }
    } else {
      console.warn('Redis client not ready for getRestaurantWhatsAppNumber, fetching from source.');
    }

    console.log('Fetching restaurant WhatsApp number from database');
    const setting = await prisma.setting.findUnique({
      where: { key: RESTAURANT_WHATSAPP_KEY },
    });
    
    const whatsappNumber = setting?.value || null;

    if (whatsappNumber && redisClient.status === 'ready') {
      await redisClient.set(RESTAURANT_WHATSAPP_KEY, whatsappNumber, 'EX', 3600 * 24); // Cache for 24 hours
      console.log('Restaurant WhatsApp number cached in Redis');
    }
    return whatsappNumber;
  } catch (error) {
    console.error('Error fetching restaurant WhatsApp number:', error);
    return null; // Fallback or default
  }
}

// Example function to update a setting (ensure proper admin rights for this in a real app)
export async function updateSetting(key: string, value: string): Promise<boolean> {
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    // Invalidate cache for this setting
    if (redisClient.status === 'ready') {
      await redisClient.del(key); // Assuming cache key matches setting key
      console.log(`Cache for setting ${key} invalidated after update.`);
    }
    return true;
  } catch (error) {
    console.error(`Error updating setting ${key}:`, error);
    return false;
  }
}
