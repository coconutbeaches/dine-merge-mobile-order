// src/lib/api/orders.ts

// --- Replicated/adapted types for client-side usage ---
// These types should align with what the API endpoint for orders will return,
// and what client components expect. They are derived from the original
// types in `src/lib/server/orders.ts`.

interface MenuItemForOrder {
  id: string;
  name: string;
  price: number;
  image?: string | null;
}

export interface EnrichedOrderItem {
  id: string;
  quantity: number;
  price: number; // Price at the time of order
  name: string; // Name at the time of order
  menuItemId: string;
  orderId: string;
  menuItem: MenuItemForOrder | null;
  // PrismaOrderItem might have createdAt/updatedAt, but often not directly used in client item lists.
  // If they are, they should be string type after JSON serialization and parsed if needed.
}

// This type is used by `whatsapp/page.tsx` as `OrderWithItems`.
// We'll align with that naming for clarity in client-side imports.
export interface OrderWithItems {
  id: string;
  createdAt: string; // Dates will be strings from JSON
  updatedAt: string; // Dates will be strings from JSON
  status: string; // Consider using the OrderStatus enum if it's client-safe or replicating it
  total: number;
  isPaid: boolean;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  tableNumber: number | null;
  isTakeAway: boolean;
  isTableService: boolean;
  notes: string | null;
  whatsappMessageGenerated: boolean;
  items: EnrichedOrderItem[];
  // Customer object can be included if needed by the client
  // customer?: { id: string; name: string | null; phone: string; createdAt: string; updatedAt: string; } | null;
}

// Helper to parse dates from fetched JSON data
// Necessary because `fetch` will return dates as strings.
const parseOrderDates = (order: OrderWithItems): OrderWithItems => {
  return {
    ...order,
    createdAt: new Date(order.createdAt).toISOString(), // Keep as ISO string or parse to Date object as needed by UI
    updatedAt: new Date(order.updatedAt).toISOString(),
    // items: order.items.map(item => ({
    //   ...item,
    //   // If menuItem had dates that came as strings and needed parsing:
    //   // menuItem: item.menuItem ? { ...item.menuItem, createdAt: new Date(item.menuItem.createdAt), updatedAt: new Date(item.menuItem.updatedAt) } : null,
    // })),
    // customer: order.customer ? { ...order.customer, createdAt: new Date(order.customer.createdAt), updatedAt: new Date(order.customer.updatedAt) } : null,
  };
};


/**
 * Fetches a single order by its ID from the API.
 * This function is client-safe and uses `fetch`.
 * @param id The ID of the order to fetch.
 * @returns {Promise<OrderWithItems | null>} The order details or null if not found or an error occurs.
 */
export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  try {
    // The API route would be something like /api/orders/[orderId]
    // For now, using a placeholder structure. This will need to be an actual API route.
    const response = await fetch(`/api/orders/${id}`);

    if (!response.ok) {
      console.error(`Failed to fetch order ${id}:`, response.status, response.statusText);
      // It might be useful to return response.status for more specific error handling client-side
      if (response.status === 404) {
        return null; // Explicitly null for not found
      }
      // For other errors, still return null or throw a more specific error.
      return null;
    }

    const data = await response.json();

    // Basic validation
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      console.error(`Fetched order data for ${id} is not a valid object:`, data);
      return null;
    }
    if (data.error) {
      console.error(`API error for order ${id}:`, data.error);
      return null;
    }

    // Assuming the API returns data that matches OrderWithItems structure,
    // and dates are ISO strings that need to be handled (e.g., parsed or used as is).
    // The parseOrderDates helper can be used if dates need to be Date objects,
    // but often passing ISO strings to UI components is fine.
    // For now, we'll assume the data is directly usable or needs minimal parsing like below.
    return parseOrderDates(data as OrderWithItems);
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error);
    return null;
  }
}
