import React from 'react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { formatThaiCurrency, cn } from '@/lib/utils';
import { formatOrderDate, formatOrderTime, getStatusBadgeClasses, getStatusBadgeHoverClasses } from '@/utils/orderDashboardUtils';

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
  selectAllOrders: () => void;
  clearSelection: () => void;
}

const OrdersList = ({ 
  orders, 
  selectedOrders, 
  toggleSelectOrder,
  updateOrderStatus,
  orderStatusOptions,
  selectAllOrders,
  clearSelection,
}: OrdersListProps) => {
  if (orders.length === 0) {
    return <div className="p-6 text-center text-muted-foreground">No orders found.</div>;
  }

  const allSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const isIndeterminate = selectedOrders.length > 0 && !allSelected;

  const handleSelectAllChange = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAllOrders();
    }
  };

  return (
    <div>
      {/* Header row for select all */}
      <div className="grid grid-cols-12 gap-x-1 md:gap-x-3 p-3 items-center border-b bg-muted/50 text-sm font-medium text-muted-foreground">
        <div className="col-span-1 flex items-center min-w-[32px]">
            <Checkbox 
                checked={isIndeterminate ? 'indeterminate' : allSelected}
                onCheckedChange={handleSelectAllChange}
                aria-label="Select all orders"
            />
        </div>
        <div className="col-span-11"></div>
      </div>
      {/* Orders rows */}
      {orders.map((order) => {
        const customerDisplayName = order.customer_name_from_profile || 
                                  order.customer_name || 
                                  order.guest_first_name ||
                                  `Order #${order.id}`;

        // Debug log for guest orders
        if (order.guest_user_id || order.guest_first_name) {
          console.log(`Order #${order.id} display name logic:`, {
            customer_name_from_profile: order.customer_name_from_profile,
            customer_name: order.customer_name,
            guest_first_name: order.guest_first_name,
            guest_user_id: order.guest_user_id,
            finalDisplayName: customerDisplayName
          });
        }

        const statusVal: OrderStatus = order.order_status || "new";

        return (
          <div
            key={order.id}
            className="grid grid-cols-12 gap-x-1 md:gap-x-3 p-3 items-center border-b last:border-b-0 hover:bg-muted/20 text-sm"
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
            <div className="col-span-4 min-w-0">
              {order.user_id ? (
                <Link 
                  href={`/admin/customer-orders/${order.user_id}`} 
                  className="font-medium text-primary hover:underline truncate block"
                  title={`View all orders for ${customerDisplayName} (${order.customer_email_from_profile || 'No Email'})`}
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
            {/* Order Amount */}
            <div
              className="col-span-2 text-right font-bold pl-1 pr-4"
              title={`Order #${order.id}`}
              style={{ minWidth: 0 }}
            >
              <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                {formatThaiCurrency(order.total_amount)}
              </Link>
            </div>
            {/* Date/Time */}
            <div
              className="col-span-2 text-xs text-muted-foreground flex flex-col space-y-0.5 leading-tight"
              title={`Order #${order.id}`}
              style={{ minWidth: 0 }}
            >
              <span>{formatOrderDate(order.created_at)}</span>
              <span>{formatOrderTime(order.created_at)}</span>
            </div>
            {/* Order Status: as a small pill-shaped select */}
            <div className="col-span-3 min-w-[70px] md:min-w-[100px] flex items-center justify-end">
              <Select
                value={statusVal}
                onValueChange={(value: OrderStatus) => updateOrderStatus(order.id, value)}
              >
                <SelectTrigger
                  className={cn(
                    "min-w-[70px] max-w-full h-6 px-3 text-xs font-semibold border-0 shadow-none focus:ring-0 rounded-full transition-colors",
                    getStatusBadgeClasses(statusVal),
                    getStatusBadgeHoverClasses(statusVal)
                  )}
                  style={{ boxShadow: 'none', minWidth: 0, height: 24 }}
                >
                  <SelectValue asChild>
                    <span className="capitalize">{statusVal === 'delivery' ? 'Delivery' : statusVal}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {orderStatusOptions.map(statusOption => (
                    <SelectItem
                      key={statusOption}
                      value={statusOption}
                      className={cn(
                        "capitalize text-xs font-semibold rounded-full m-1 pr-3 py-1 cursor-pointer outline-none border-0 pl-8",
                        getStatusBadgeClasses(statusOption),
                        getStatusBadgeHoverClasses(statusOption)
                      )}
                    >
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
