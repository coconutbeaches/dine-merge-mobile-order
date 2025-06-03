import React from 'react';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
// Remove Select imports if no longer used directly here for status
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button'; // Added Button
import { FilePenLine } from 'lucide-react'; // Added an icon
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { formatThaiCurrency } from '@/lib/utils';
import { formatDate, getStatusColorDot } from '@/utils/orderDashboardUtils'; // getStatusColorDot might be kept for visual cue if desired elsewhere

interface OrdersListProps {
  orders: Order[];
  selectedOrders: number[];
  toggleSelectOrder: (orderId: number) => void;
  // updateOrderStatus: (orderId: number, newStatus: OrderStatus) => void; // This prop might be removed if status is only edited on the form
  // orderStatusOptions: OrderStatus[]; // This prop might also be removed
}

// Note: Depending on whether updateOrderStatus and orderStatusOptions are used elsewhere in the parent,
// they might not be removed from props entirely, but their direct use here is changing.
// For this task, we assume they are primarily for the removed Select.
const OrdersList = ({ 
  orders, 
  selectedOrders, 
  toggleSelectOrder,
  // updateOrderStatus, // Removed for this change
  // orderStatusOptions // Removed for this change
}: OrdersListProps) => {
  if (orders.length === 0) {
    return <div className="p-6 text-center text-muted-foreground">No orders found.</div>;
  }

  return (
    <div>
      {orders.map((order) => (
        <div 
          key={order.id} 
          className="grid grid-cols-12 gap-x-2 md:gap-x-3 p-3 items-center border-b last:border-b-0 hover:bg-muted/20 text-sm"
        >
          {/* Checkbox */}
          <div className="col-span-1 flex items-center">
            <Checkbox 
              checked={selectedOrders.includes(order.id)} 
              onCheckedChange={() => toggleSelectOrder(order.id)}
              aria-label={`Select order ${order.id}`}
            />
          </div>
          {/* Customer Name/Order ID */}
          <div className="col-span-3">
            {order.user_id ? (
              <Link 
                to={`/admin/customer-orders/${order.user_id}`} 
                className="font-medium text-primary hover:underline truncate block"
                title={`${order.customer_name_from_profile || 'N/A'} (${order.customer_email_from_profile || 'No Email'})`}
              >
                {order.customer_name_from_profile || `Order #${order.id.toString().padStart(4, '0')}`}
              </Link>
            ) : (
              <div 
                className="font-medium truncate" 
                title={`${order.customer_name_from_profile || order.customer_name || 'Guest'} (${order.customer_email_from_profile || 'N/A'})`}
              >
                {order.customer_name_from_profile || order.customer_name || `Order #${order.id.toString().padStart(4, '0')}`}
              </div>
            )}
             {/* Display current status textually for quick view */}
            <div className="text-xs text-muted-foreground capitalize flex items-center mt-0.5">
                <span className={`w-2 h-2 rounded-full mr-1.5 ${getStatusColorDot(order.order_status || 'new')}`}></span>
                {order.order_status || 'N/A'}
            </div>
          </div>
          {/* Table Number */}
          <div className="col-span-2 text-xs text-muted-foreground capitalize">
            {order.table_number ? (order.table_number === 'Take Away' ? 'Take Away' : `Table ${order.table_number}`) : 'N/A'}
          </div>
          {/* Total Amount */}
          <div className="col-span-2 text-right">{formatThaiCurrency(order.total_amount)}</div>
          {/* Date */}
          <div className="col-span-2 text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
          
          {/* Edit Button Column (replaces old status select) */}
          <div className="col-span-2 flex justify-end"> {/* Changed to flex justify-end for button alignment */}
            <Link to={`/admin/edit-order/${order.id}`}>
              <Button variant="outline" size="sm">
                <FilePenLine className="h-4 w-4 mr-2 md:mr-0 lg:mr-2" /> {/* Responsive icon margin */}
                <span className="hidden md:inline lg:inline">Edit</span> {/* Show text on larger screens */}
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrdersList;
