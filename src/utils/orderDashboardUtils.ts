
import { format } from 'date-fns';
import { OrderStatus, SupabaseOrderStatus } from '@/types/supabaseTypes';
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

// Get the appropriate color for status indicators
export const getStatusColorDot = (status: string | null) => {
  switch (status) {
    case 'new':
      return "bg-red-500";
    case 'confirmed':
      return "bg-green-500";
    case 'delivered':
      return "bg-blue-500";
    case 'paid':
      return "bg-green-700";
    case 'cancelled':
      return "bg-gray-500";
    default:
      return "bg-gray-300";
  }
};

// Define the order statuses for the dropdown
export const orderStatusOptions: OrderStatus[] = ['new', 'confirmed', 'delivered', 'paid', 'cancelled'];
