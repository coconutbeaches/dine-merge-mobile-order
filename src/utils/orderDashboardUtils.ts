import { format } from 'date-fns';
import { OrderStatus, SupabaseOrderStatus } from '@/types/app';
import { formatThaiCurrency } from '@/lib/utils';

// Format date to a shorter, more readable format
export const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return format(date, 'dd MMM yy HH:mm'); // Shorter date format
  } catch (e) {
    return 'Invalid Date';
  }
};

// Format to "Jun 02"
export const formatOrderDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd'); // Removed year
  } catch (e) {
    return 'Invalid Date';
  }
};

// Format to "21:00" (24-hour format)
export const formatOrderTime = (dateString: string | null) => {
  if (!dateString) return '--:--';
  try {
    const date = new Date(dateString);
    return format(date, 'HH:mm'); // Changed from 'hh:mm a' to 'HH:mm' for 24-hour format
  } catch (e) {
    return '--:--';
  }
};

// Format to "MMM dd yyyy h:mm a"
export const formatOrderDateTime = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd yyyy h:mm a');
  } catch (e) {
    return 'Invalid Date';
  }
};

// Format to "MMMM d, yyyy 'at' h:mm a"
export const formatDetailedDateTime = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return format(date, "MMMM d, yyyy 'at' h:mm a");
  } catch (e) {
    return 'Invalid Date';
  }
};

// Get the appropriate color for status indicators
export const getStatusColorDot = (status: OrderStatus | null) => {
  switch (status) {
    case 'new':
      return "bg-red-500";
    case 'preparing':
      return "bg-yellow-500";
    case 'ready':
      return "bg-orange-500";
    case 'delivery':
      return "bg-blue-500";
    case 'completed':
      return "bg-green-500";
    case 'paid':
      return "bg-green-700";
    case 'cancelled':
      return "bg-gray-500";
    default:
      return "bg-gray-300";
  }
};

// Get the appropriate classes for status badges
export const getNewStatusBadgeClasses = (status: OrderStatus | null) => {
  switch (status) {
    case 'new':
      return "border-red-500 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
    case 'preparing':
      return "border-yellow-500 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300";
    case 'ready':
      return "border-orange-500 bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
    case 'delivery':
      return "border-blue-500 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
    case 'completed':
      return "border-green-500 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300";
    case 'paid':
      return "border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
    case 'cancelled':
      return "border-gray-500 bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-400";
    default:
      return "border-gray-300 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
};

// Get the appropriate classes for status badges
export const getStatusBadgeClasses = (status: OrderStatus | null) => {
  switch (status) {
    case 'new':
      return "bg-red-500 text-white";
    case 'preparing':
      return "bg-yellow-400 text-yellow-900";
    case 'ready':
      return "bg-orange-500 text-white";
    case 'delivery':
      return "bg-blue-500 text-white";
    case 'completed':
      return "bg-green-500 text-white";
    case 'paid':
      return "bg-green-700 text-white";
    case 'cancelled':
      return "bg-gray-500 text-white";
    default:
      return "bg-gray-300 text-gray-800";
  }
};

export const getStatusBadgeHoverClasses = (status: OrderStatus | null) => {
  switch (status) {
    case 'new':
      return "hover:bg-red-400 focus:bg-red-400 focus:text-white";
    case 'preparing':
      return "hover:bg-yellow-300 focus:bg-yellow-300 focus:text-yellow-900";
    case 'ready':
      return "hover:bg-orange-400 focus:bg-orange-400 focus:text-white";
    case 'delivery':
      return "hover:bg-blue-400 focus:bg-blue-400 focus:text-white";
    case 'completed':
      return "hover:bg-green-400 focus:bg-green-400 focus:text-white";
    case 'paid':
      return "hover:bg-green-600 focus:bg-green-600 focus:text-white";
    case 'cancelled':
      return "hover:bg-gray-400 focus:bg-gray-400 focus:text-white";
    default:
      return "hover:bg-gray-200 focus:bg-gray-200 focus:text-gray-800";
  }
};

export const getStatusClass = (status: OrderStatus) => {
  switch (status) {
    case 'new':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'confirmed':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'preparing':
      return 'bg-indigo-500 hover:bg-indigo-600';
    case 'ready for pickup':
      return 'bg-green-500 hover:bg-green-600';
    case 'completed':
      return 'bg-teal-500 hover:bg-teal-600';
    case 'cancelled':
      return 'bg-red-500 hover:bg-red-600';
    default:
      return 'bg-gray-500 hover:bg-gray-600';
  }
};

// Updated orderStatuses to use 'delivery' for frontend consistency.
export const orderStatusOptions: OrderStatus[] = [
  'new',
  'preparing',
  'ready',
  'delivery',
  'completed',
  'paid',
  'cancelled'
];

export const mapSupabaseToOrderStatus = (
  status: SupabaseOrderStatus | null,
): OrderStatus => {
  return status as OrderStatus;
};

export const mapOrderStatusToSupabase = (status: OrderStatus): any => {
  return status;
};

/**
 * Safely formats the last order date, handling null/undefined values gracefully
 * @param date - The date value which may be string, null, or undefined
 * @returns Formatted date string or 'Never' for null/undefined values
 */
export const formatLastOrderDate = (date: string | null | undefined): string => {
  // Handle null, undefined, or empty values
  if (date === null || date === undefined || date === '') {
    return 'Never';
  }

  // Ensure we have a string
  const dateStr = typeof date === 'string' ? date : String(date);
  
  // Check for empty string after trimming
  if (!dateStr.trim()) {
    return 'Never';
  }

  try {
    const parsed = new Date(dateStr);
    
    // Check if the date is valid
    if (isNaN(parsed.getTime())) {
      return 'Never';
    }
    
    return format(parsed, 'MMM d, yyyy h:mm a');
  } catch (error) {
    // Log error for debugging but return fallback
    console.warn('Error formatting last order date:', error, 'Input:', dateStr);
    return 'Never';
  }
};
