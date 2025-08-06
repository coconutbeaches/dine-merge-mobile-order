import React from 'react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderStatus } from '@/types/supabaseTypes';
import { ExtendedOrder } from '@/src/types/app';
import { formatThaiCurrency, cn } from '@/lib/utils';
import { formatOrderDate, formatOrderTime, getStatusBadgeClasses, getStatusBadgeHoverClasses } from '@/utils/orderDashboardUtils';
import { formatStayId } from '@/src/utils/guestUtils';

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
  orders: ExtendedOrder[];
  selectedOrders: number[];
  toggleSelectOrder: (orderId: number) => void;
  updateOrderStatus: (orderId: number, newStatus: OrderStatus) => void;
  orderStatusOptions: OrderStatus[];
  selectAllOrders: () => void;
  clearSelection: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

const OrdersList = ({ 
  orders, 
  selectedOrders, 
  toggleSelectOrder,
  updateOrderStatus,
  orderStatusOptions,
  selectAllOrders,
  clearSelection,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
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
    <div data-testid="orders-list">
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
        // For guest orders, prioritize family account name (stay_id) over individual guest name
        // For authenticated users, prefer profile name even if stay_id exists
        let customerDisplayName;
        let baseName;
        
        // Apply new logic for name formatting
        if (baseName && baseName.match(/^walkin-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
          customerDisplayName = "Walkin";
        } else if (baseName && baseName.match(/^-\d+$/)) {
          customerDisplayName = "Walkin";
        } else if (baseName && baseName.endsWith("-Take Away")) {
          customerDisplayName = "Walkin";
        } else if (order.stay_id && !order.stay_id.toLowerCase().startsWith('walkin')) {
          // If it has a stay_id and it's not a walkin, display the formatted stay_id
          customerDisplayName = formatStayId(order.stay_id);
        } else if (baseName && baseName.match(/-\d+$/)) {
          customerDisplayName = baseName.replace(/-\d+$/, '');
        } else {
          customerDisplayName = baseName;
        }


        const statusVal: OrderStatus = order.order_status || "new";

        return (
          <div
            key={order.id}
            data-testid="order-row"
            data-order-id={order.id}
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
              {(order.user_id || order.stay_id) ? (
                <div>
                  <Link 
                    href={`/admin/customer-orders/${order.user_id || order.stay_id}`} 
                    className="text-sm font-semibold hover:underline block"
                    title={`View all orders for ${customerDisplayName} ${order.user_id ? `(${order.customer_email_from_profile || 'No Email'})` : '(Guest Family)'}`}
                  >
                    <div className="flex items-center gap-1">
                      {customerDisplayName}
                    </div>
                  </Link>
                  {order.guest_user_id && order.guest_first_name && order.stay_id && (
                    <div className="text-xs text-muted-foreground">{order.guest_first_name}</div>
                  )}
                </div>
              ) : (
                <div>
                  <div 
                    className="text-sm font-semibold truncate" 
                    title={`${customerDisplayName} ${order.user_id ? `(${order.customer_email_from_profile || 'No Email'})` : '(Guest)'}`}
                  >
                    <div className="flex items-center gap-1">
                      {customerDisplayName}
                    </div>
                  </div>
                  {order.guest_user_id && order.guest_first_name && order.stay_id && (
                    <div className="text-xs text-muted-foreground">{order.guest_first_name}</div>
                  )}
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
      
      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="p-4 border-t bg-muted/20 text-center">
          <Button 
            variant="outline" 
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="min-w-[120px]"
          >
            {isLoadingMore ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Loading...
              </div>
            ) : (
              'Load More Orders'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrdersList;
