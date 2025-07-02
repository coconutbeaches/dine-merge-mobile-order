import React from 'react';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Use OrderWithCustomerDetails from useFetchOrders for the order type
import { OrderWithCustomerDetails } from '@/hooks/useFetchOrders';
import { OrderStatus } from '@/types/supabaseTypes';
import { formatThaiCurrency, cn } from '@/lib/utils';
import { formatOrderDate, formatOrderTime, getStatusBadgeClasses, getStatusBadgeHoverClasses } from '@/utils/orderDashboardUtils';
import { Button } from '@/components/ui/button'; // For Load More button
import { Loader2, Inbox } from 'lucide-react'; // For loading icon and empty state

interface OrdersListProps {
  orders: OrderWithCustomerDetails[]; // Use the more detailed type
  selectedOrders: number[]; // Assuming order IDs are numbers
  toggleSelectOrder: (orderId: number) => void;
  updateOrderStatus: (orderId: number, newStatus: OrderStatus) => void;
  orderStatusOptions: OrderStatus[];
  selectAllOrders: () => void; // Should now correctly use the filtered list from parent
  clearSelection: () => void;
  // Pagination props
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
}

const OrdersList = ({ 
  orders, 
  selectedOrders, 
  toggleSelectOrder,
  updateOrderStatus,
  orderStatusOptions,
  selectAllOrders,
  clearSelection,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: OrdersListProps) => {

  // Show "No orders found" only if truly no orders and no more to load.
  if (orders.length === 0 && !isFetchingNextPage && !hasNextPage) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No Orders Found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          There are no orders matching your current filters.
        </p>
      </div>
    );
  }

  const allSelectedOnPage = orders.length > 0 && orders.every(o => selectedOrders.includes(o.id));
  const isIndeterminate = selectedOrders.length > 0 && !allSelectedOnPage;

  const handleSelectAllChange = () => {
    if (allSelectedOnPage) {
      clearSelection(); // Clears all selected orders
    } else {
      selectAllOrders(); // Selects all orders passed in (which should be filtered list)
    }
  };

  return (
    <div>
      {/* Header row for select all, only if there are orders to display */}
      {orders.length > 0 && (
        <div className="grid grid-cols-12 gap-x-1 md:gap-x-3 p-3 items-center border-b bg-muted/50 text-sm font-medium text-muted-foreground">
          <div className="col-span-1 flex items-center min-w-[32px]">
              <Checkbox
                  checked={isIndeterminate ? 'indeterminate' : allSelectedOnPage}
                  onCheckedChange={handleSelectAllChange}
                  aria-label="Select all orders on this page"
              />
          </div>
          <div className="col-span-11"></div> {/* Placeholder for other header info if needed */}
        </div>
      )}

      {/* Orders rows */}
      {orders.map((order) => {
        // customer_name_from_profile is now directly on the order object from useFetchOrders
        const customerDisplayName = order.customer_name_from_profile || 
                                  order.customer_name || // Fallback if join failed or no profile
                                  `Order #${order.id}`;

        const statusVal: OrderStatus = order.order_status || "new"; // Default to new if undefined

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
            {/* Order Amount */}
            <div
              className="col-span-2 text-right font-bold pl-1 pr-4"
              title={`Order #${order.id}`}
              style={{ minWidth: 0 }}
            >
              <Link to={`/admin/orders/${order.id}`} className="hover:underline">
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
                <SelectContent>
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
      {hasNextPage && (
        <div className="flex justify-center py-4">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
            size="sm"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading More...
              </>
            ) : (
              'Load More Orders'
            )}
          </Button>
        </div>
      )}
      {/* Message if all orders are loaded and list is empty (e.g. due to filters) */}
      {orders.length > 0 && !hasNextPage && !isFetchingNextPage && (
         <div className="p-4 text-center text-sm text-muted-foreground">
           All orders loaded.
         </div>
      )}
       {(orders.length === 0 && hasNextPage) && (
         <div className="flex justify-center py-4">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load Orders'
            )}
          </Button>
        </div>
       )}
    </div>
  );
};

export default OrdersList;
