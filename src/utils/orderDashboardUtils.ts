import { format } from 'date-fns';
import { OrderStatus } from '@/types/supabaseTypes';
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
    case 'out_for_delivery':
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
    case 'out_for_delivery':
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
    case 'out_for_delivery':
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

// Updated orderStatuses to place "paid" after "completed" but before "cancelled"
export const orderStatusOptions: OrderStatus[] = [
  'new',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'paid',
  'cancelled'
];
