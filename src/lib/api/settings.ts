import { prisma } from '@/lib/db';
import { RestaurantSettings } from '@prisma/client';
import { cache } from 'react';
import { redis } from '@/lib/redis';

// Types
export type UpdateRestaurantSettingsInput = Partial<{
  name: string;
  nameEn: string;
  logo: string;
  whatsappNumber: string;
  currency: string;
  address: string;
  instagram: string;
  facebook: string;
  website: string;
  openingHours: string;
  closingHours: string;
  isOpen: boolean;
}>;

// Cache keys
const SETTINGS_CACHE_KEY = 'restaurant:settings';

// Cache duration in seconds
const CACHE_TTL = 60 * 60; // 1 hour

/**
 * Get restaurant settings
 * 
 * Cached with React cache() for server components
 * Also cached in Redis for API routes
 * 
 * @returns Restaurant settings or default settings if none exist
 */
export const getRestaurantSettings = cache(async (): Promise<RestaurantSettings | null> => {
  // Try to get from Redis cache first
  try {
    const cached = await redis.get(SETTINGS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Redis cache error:', error);
  }
  
  // Query database if not in cache
  let settings = await prisma.restaurantSettings.findFirst();
  
  // If no settings exist, create default settings
  if (!settings) {
    settings = await createDefaultSettings();
  }
  
  // Store in Redis cache
  try {
    await redis.set(SETTINGS_CACHE_KEY, JSON.stringify(settings), 'EX', CACHE_TTL);
  } catch (error) {
    console.error('Redis cache error:', error);
  }
  
  return settings;
});

/**
 * Update restaurant settings
 * 
 * @param data - Settings data to update
 * @returns Updated restaurant settings
 */
export async function updateRestaurantSettings(data: UpdateRestaurantSettingsInput): Promise<RestaurantSettings> {
  // Get current settings to determine if we need to create or update
  const currentSettings = await prisma.restaurantSettings.findFirst();
  
  let updatedSettings: RestaurantSettings;
  
  if (currentSettings) {
    // Update existing settings
    updatedSettings = await prisma.restaurantSettings.update({
      where: { id: currentSettings.id },
      data,
    });
  } else {
    // Create new settings
    updatedSettings = await prisma.restaurantSettings.create({
      data: {
        name: data.name || 'Coconut Beach Restaurant',
        nameEn: data.nameEn || 'Coconut Beach Restaurant',
        logo: data.logo || '/images/logo.png',
        whatsappNumber: data.whatsappNumber || '66812345678',
        currency: data.currency || '฿',
        address: data.address || '',
        instagram: data.instagram || '',
        facebook: data.facebook || '',
        website: data.website || '',
        openingHours: data.openingHours || '09:00',
        closingHours: data.closingHours || '22:00',
        isOpen: data.isOpen ?? true,
      },
    });
  }
  
  // Invalidate cache
  try {
    await redis.del(SETTINGS_CACHE_KEY);
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return updatedSettings;
}

/**
 * Toggle restaurant open/closed status
 * 
 * @param isOpen - Whether the restaurant is open
 * @returns Updated restaurant settings
 */
export async function toggleRestaurantOpen(isOpen: boolean): Promise<RestaurantSettings> {
  // Get current settings
  const currentSettings = await prisma.restaurantSettings.findFirst();
  
  if (!currentSettings) {
    // Create default settings with specified open status
    const newSettings = await createDefaultSettings(isOpen);
    return newSettings;
  }
  
  // Update open status
  const updatedSettings = await prisma.restaurantSettings.update({
    where: { id: currentSettings.id },
    data: { isOpen },
  });
  
  // Invalidate cache
  try {
    await redis.del(SETTINGS_CACHE_KEY);
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
  
  return updatedSettings;
}

/**
 * Create default restaurant settings
 * 
 * @param isOpen - Optional override for isOpen status
 * @returns Created restaurant settings
 */
async function createDefaultSettings(isOpen: boolean = true): Promise<RestaurantSettings> {
  const settings = await prisma.restaurantSettings.create({
    data: {
      name: 'Coconut Beach Restaurant',
      nameEn: 'Coconut Beach Restaurant',
      logo: '/images/logo.png',
      whatsappNumber: '66812345678',
      currency: '฿',
      address: 'Coconut Beach, Thailand',
      instagram: 'coconutbeachrestaurant',
      facebook: 'coconutbeachrestaurant',
      website: 'https://coconutbeach.restaurant',
      openingHours: '09:00',
      closingHours: '22:00',
      isOpen,
    },
  });
  
  return settings;
}

/**
 * Get WhatsApp number in international format
 * 
 * @returns WhatsApp number with proper formatting
 */
export async function getWhatsAppNumber(): Promise<string> {
  const settings = await getRestaurantSettings();
  
  // Default WhatsApp number if settings don't exist
  if (!settings || !settings.whatsappNumber) {
    return '66812345678';
  }
  
  // Return the WhatsApp number, ensuring it doesn't have a + prefix
  return settings.whatsappNumber.replace(/^\+/, '');
}

/**
 * Get restaurant currency symbol
 * 
 * @returns Currency symbol (defaults to ฿)
 */
export async function getCurrencySymbol(): Promise<string> {
  const settings = await getRestaurantSettings();
  
  // Default to Thai Baht if settings don't exist
  if (!settings || !settings.currency) {
    return '฿';
  }
  
  return settings.currency;
}

/**
 * Check if restaurant is currently open
 * 
 * @returns Boolean indicating if restaurant is open
 */
export async function isRestaurantOpen(): Promise<boolean> {
  const settings = await getRestaurantSettings();
  
  // Default to open if settings don't exist
  if (!settings) {
    return true;
  }
  
  // If manually set to closed, return false
  if (!settings.isOpen) {
    return false;
  }
  
  // Check if current time is within opening hours
  // This is a simple implementation - a real one might handle day of week, holidays, etc.
  const now = new Date();
  const currentTimeString = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false,
    timeZone: 'Asia/Bangkok' 
  });
  
  const openingTime = settings.openingHours || '09:00';
  const closingTime = settings.closingHours || '22:00';
  
  return currentTimeString >= openingTime && currentTimeString <= closingTime;
}
