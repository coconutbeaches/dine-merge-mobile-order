
import React from 'react';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { formatThaiCurrency } from '@/lib/utils';
import { formatOrderDate, formatOrderTime, getStatusColorDot } from '@/utils/orderDashboardUtils';

// Helper for pill-style status badge (smaller, rounded, colored)
const getStatusPillStyles = (status: OrderStatus) => {
  switch (status) {
    case 'new':
      return 'bg-red-100 text-red-700 border border-red-200';
    case 'preparing':
      return 'bg-yellow-300 text-yellow-900 border border-yellow-400';
    case 'ready':
      return 'bg-orange-200 text-orange-800 border border-orange-400';
    case 'delivery':
      return 'bg-blue-100 text-blue-700 border border-blue-300';
    case 'completed':
      return 'bg-green-100 text-green-800 border border-green-300';
    case 'paid':
      return 'bg-green-200 text-green-900 border border-green-400';
    case 'cancelled':
      return 'bg-gray-200 text-gray-600 border border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-300';
  }
};

interface OrdersListProps {
  orders: Order[];
  selectedOrders: number[];
  toggleSelectOrder: (orderId: number) => void;
  updateOrderStatus: (orderId: number, newStatus: OrderStatus) => void;
  orderStatusOptions: OrderStatus[];
}

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
      {/* Orders rows */}
      {orders.map((order) => {
        const customerDisplayName = order.customer_name_from_profile || 
                                  order.customer_name || 
                                  `Order #${order.id}`;

        const statusVal: OrderStatus = order.order_status || "new";
        const statusPillStyle = getStatusPillStyles(statusVal);

        return (
          <div
            key={order.id}
            className="grid grid-cols-12 gap-x-1 md:gap-x-3 p-3 items-center border-b last:border-b-0 hover:bg-muted/20 text-sm"
            style={{
              gridTemplateColumns: "min-content minmax(0,2.5fr) minmax(0,1.1fr) minmax(0,1.2fr) min-content min-content min-content min-content min-content min-content min-content min-content"
            }}
          >
            {/* Checkbox */}
            <div className="col-span-1 flex items-center min-w-[32px]">
              <Checkbox 
                checked={selectedOrders.includes(order.id)} 
                onCheckedChange={() => toggleSelectOrder(order.id)}
                aria-label={`Select order ${order.id}`}
              />
            </div>
            {/* Customer name, table number below */}
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
              {order.table_number && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {order.table_number === 'Take Away'
                    ? 'Take Away'
                    : `Table ${order.table_number}`}
                </div>
              )}
            </div>
            {/* Order Amount (now moved left, add extra space after) */}
            <Link
              to={`/admin/order/${order.id}`}
              className="col-span-2 text-right cursor-pointer text-primary font-bold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition pl-1 pr-5"
              title={`View full order #${order.id}`}
              tabIndex={0}
              style={{ minWidth: 0 }}
            >
              {formatThaiCurrency(order.total_amount)}
            </Link>
            {/* Date/Time (clickable) */}
            <Link
              to={`/admin/order/${order.id}`}
              className="col-span-2 text-xs text-primary flex flex-col space-y-0.5 leading-tight cursor-pointer hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition"
              title={`View full order #${order.id}`}
              tabIndex={0}
              style={{ minWidth: 0 }}
            >
              <span>{formatOrderDate(order.created_at)}</span>
              <span>{formatOrderTime(order.created_at)}</span>
            </Link>
            {/* Order Status: as a small pill-shaped select */}
            <div className="col-span-3 min-w-[70px] md:min-w-[100px] flex items-center">
              <Select
                value={statusVal}
                onValueChange={(value: OrderStatus) => updateOrderStatus(order.id, value)}
              >
                <SelectTrigger
                  className={`min-w-[70px] max-w-full h-6 px-2 text-xs font-semibold border-0 shadow-none focus:ring-0 ${statusPillStyle} rounded-full transition`}
                  style={{ boxShadow: 'none', minWidth: 0, height: 24 }}
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-1 ${getStatusColorDot(statusVal)}`}
                  ></span>
                  <span className="capitalize">{statusVal === 'delivery' ? 'Delivery' : statusVal}</span>
                </SelectTrigger>
                <SelectContent>
                  {orderStatusOptions.map(statusOption => (
                    <SelectItem
                      key={statusOption}
                      value={statusOption}
                      className="flex items-center gap-2 text-xs capitalize"
                    >
                      <span className={`inline-block w-2 h-2 rounded-full ${getStatusColorDot(statusOption)}`}></span>
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
