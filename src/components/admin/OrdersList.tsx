
import React from 'react';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { formatThaiCurrency } from '@/lib/utils';
import { formatOrderDate, formatOrderTime, getStatusColorDot } from '@/utils/orderDashboardUtils';

interface OrdersListProps {
  orders: Order[];
  selectedOrders: number[];
  toggleSelectOrder: (orderId: number) => void;
  updateOrderStatus: (orderId: number, newStatus: OrderStatus) => void;
  orderStatusOptions: OrderStatus[];
}

// Helper: returns bg/fg ring/label per status for the button redesign
const getStatusButtonStyles = (status: OrderStatus) => {
  switch (status) {
    case 'new':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'preparing':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'ready':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'delivery':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'paid':
      return 'bg-green-200 text-green-900 border-green-400';
    case 'cancelled':
      return 'bg-gray-200 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const OrdersList = ({ 
  orders, 
  selectedOrders, 
  toggleSelectOrder,
  updateOrderStatus,
  orderStatusOptions
}: OrdersListProps) => {
  if (orders.length === 0) {
    return <div className="p-6 text-center text-muted-foreground">No orders found.</div>;
  }

  return (
    <div>
      {orders.map((order) => {
        const customerDisplayName = order.customer_name_from_profile || 
                                  order.customer_name || 
                                  `Order #${order.id}`;

        const statusVal: OrderStatus = order.order_status || "new";
        const statusButtonStyle = getStatusButtonStyles(statusVal);

        return (
          // Adjusted grid: removed the table column, widen status column
          <div
            key={order.id}
            className="grid grid-cols-11 gap-x-1 md:gap-x-3 p-3 items-center border-b last:border-b-0 hover:bg-muted/20 text-sm"
          >
            {/* Selection */}
            <div className="col-span-1 flex items-center min-w-[32px]">
              <Checkbox 
                checked={selectedOrders.includes(order.id)} 
                onCheckedChange={() => toggleSelectOrder(order.id)}
                aria-label={`Select order ${order.id}`}
              />
            </div>
            {/* Customer (name + table number below if present) */}
            <div className="col-span-3 min-w-0">
              {order.user_id ? (
                <Link 
                  to={`/admin/customer-orders/${order.user_id}`} 
                  className="font-medium text-primary hover:underline truncate block"
                  title={`${customerDisplayName} (${order.customer_email_from_profile || 'No Email'})`}
                >
                  {customerDisplayName}
                </Link>
              ) : (
                <div 
                  className="font-medium truncate" 
                  title={`${customerDisplayName} (${order.customer_email_from_profile || 'No Email'})`}
                >
                  {customerDisplayName}
                </div>
              )}
              {/* Table number below name, small text, muted */}
              {order.table_number && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {order.table_number === 'Take Away'
                    ? 'Take Away'
                    : `Table ${order.table_number}`}
                </div>
              )}
            </div>
            {/* Amount */}
            <div className="col-span-2 text-right">{formatThaiCurrency(order.total_amount)}</div>
            {/* Date */}
            <div className="col-span-2 text-xs text-muted-foreground flex flex-col space-y-0.5 leading-tight">
              <span>{formatOrderDate(order.created_at)}</span>
              <span>{formatOrderTime(order.created_at)}</span>
            </div>
            {/* Status column widened */}
            <div className="col-span-3 flex min-w-[140px] md:min-w-[180px]">
              <Select
                value={statusVal}
                onValueChange={(value: OrderStatus) => updateOrderStatus(order.id, value)}
              >
                <SelectTrigger
                  className={`w-full h-9 px-3 text-xs md:text-sm font-semibold border ${statusButtonStyle} flex items-center gap-2 shadow-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-colors`}
                  style={{ minWidth: 0 }} // prevent overflow
                >
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full mr-1 ${getStatusColorDot(statusVal)}`}
                  ></span>
                  <span className="capitalize">
                    {statusVal === 'delivery' ? 'Delivery' : statusVal}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {orderStatusOptions.map(statusOption => (
                    <SelectItem
                      key={statusOption}
                      value={statusOption}
                      className="flex items-center gap-2 text-xs capitalize"
                    >
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${getStatusColorDot(statusOption)}`}></span>
                      {statusOption === 'delivery' ? 'Delivery' : statusOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrdersList;

