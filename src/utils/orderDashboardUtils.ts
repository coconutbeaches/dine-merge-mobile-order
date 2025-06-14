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

// Format to "11:23 AM"
export const formatOrderTime = (dateString: string | null) => {
  if (!dateString) return '--:--';
  try {
    const date = new Date(dateString);
    return format(date, 'hh:mm a');
  } catch (e) {
    return '--:--';
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
