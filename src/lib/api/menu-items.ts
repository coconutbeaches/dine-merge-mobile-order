// src/lib/api/menu-items.ts

// Define types to match the expected API response structures
// This ensures consistency between frontend and backend data shapes.

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
  createdAt: Date; // Prisma typically returns Date objects, JSON will be string
  updatedAt: Date; // Prisma typically returns Date objects, JSON will be string
}

interface CategoryWithMenuItems {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date; // Prisma typically returns Date objects, JSON will be string
  updatedAt: Date; // Prisma typically returns Date objects, JSON will be string
  menuItems: MenuItem[];
}

/**
 * Fetches all menu items, grouped by category, from the API.
 * The API route `/api/menu-items` handles caching internally.
 */
export async function getMenuItems(): Promise<CategoryWithMenuItems[]> {
  try {
    const response = await fetch('/api/menu-items');

    if (!response.ok) {
      console.error('Failed to fetch menu items:', response.status, response.statusText);
      // Consider throwing an error or returning a more specific error object
      // throw new Error(`Failed to fetch menu items: ${response.status}`);
      return []; // Return empty array on error to prevent breaking UI
    }

    const data = await response.json();

    // Basic validation that data is an array
    if (!Array.isArray(data)) {
        console.error('Fetched menu items data is not an array:', data);
        return [];
    }
    
    // Note: Date strings from JSON will not be automatically converted to Date objects.
    // If Date objects are needed on the client, they'd need to be parsed.
    // For this example, we'll assume the client can handle date strings or further processing.
    return data as CategoryWithMenuItems[];
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return []; // Return empty array on error
  }
}

/**
 * Fetches a single menu item by its ID from the API.
 * The API route `/api/menu-items/[id]` handles caching internally.
 * @param id The ID of the menu item to fetch.
 */
export async function getMenuItemById(id: string): Promise<MenuItem | null> {
  if (!id) {
    console.error('getMenuItemById: ID is required');
    return null;
  }

  try {
    const response = await fetch(`/api/menu-items/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Menu item with ID ${id} not found.`);
        return null;
      }
      console.error(`Failed to fetch menu item ${id}:`, response.status, response.statusText);
      // throw new Error(`Failed to fetch menu item ${id}: ${response.status}`);
      return null; // Return null on other errors
    }

    const data = await response.json();
    
    // Basic validation that data is an object (and not an error response like { error: ... })
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        console.error(`Fetched menu item data for ID ${id} is not a valid object:`, data);
        return null;
    }
    if (data.error) { // Handle cases where API returns a JSON error object
        console.error(`API error for menu item ${id}:`, data.error);
        return null;
    }

    return data as MenuItem;
  } catch (error) {
    console.error(`Error fetching menu item ${id}:`, error);
    return null; // Return null on error
  }
}
