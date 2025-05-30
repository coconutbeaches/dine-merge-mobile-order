// src/lib/api/recommendations.ts

// Define a type for recommended items for clarity, matching the API response
interface RecommendedItem {
  id: string;
  name: string;
  price: number;
  image: string;
}

/**
 * Fetches recommended items from the API route.
 * The API route `/api/recommendations` handles caching internally.
 */
export async function getRecommendedItems(): Promise<RecommendedItem[]> {
  try {
    // Construct the full URL if running on the server-side and needing an absolute path,
    // or use a relative path if this function is only called from the client-side
    // after the app is mounted. For simplicity and common use with client-side
    // components calling this, a relative path is often fine.
    // If this runs server-side during SSR/SSG, ensure the base URL is correctly prefixed.
    const response = await fetch('/api/recommendations');

    if (!response.ok) {
      console.error('Failed to fetch recommendations:', response.status, response.statusText);
      // Optionally, you could throw an error here or return a specific error object
      // throw new Error(`Failed to fetch recommendations: ${response.status}`);
      return []; // Return empty array on error
    }

    const data = await response.json();
    
    // Ensure the data is an array, otherwise return empty
    if (!Array.isArray(data)) {
        console.error('Fetched recommendations data is not an array:', data);
        return [];
    }
    
    return data as RecommendedItem[];
  } catch (error) {
    console.error('Error fetching recommended items:', error);
    return []; // Return empty array on error
  }
}
