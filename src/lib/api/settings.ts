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
