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

// Updated orderStatuses to place "paid" after "completed" but before "cancelled"
export const orderStatusOptions: OrderStatus[] = [
  'new',
  'preparing',
  'ready',
  'delivery',
  'completed',
  'paid',
  'cancelled'
];
