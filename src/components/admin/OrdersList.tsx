
import React from 'react';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { formatThaiCurrency } from '@/lib/utils';
import { formatDate, getStatusColorDot } from '@/utils/orderDashboardUtils';
import { formatOrderDate, formatOrderTime } from '@/utils/orderDashboardUtils';

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
      {orders.map((order) => {
        // Determine the display name for the customer
        const customerDisplayName = order.customer_name_from_profile || 
                                  order.customer_name || 
                                  `Order #${order.id}`;
        
        console.log(`Order ${order.id} display logic:`, {
          customer_name_from_profile: order.customer_name_from_profile,
          customer_name: order.customer_name,
          final_display_name: customerDisplayName
        });

        return (
          <div 
            key={order.id} 
            className="grid grid-cols-12 gap-x-2 md:gap-x-3 p-3 items-center border-b last:border-b-0 hover:bg-muted/20 text-sm"
          >
            <div className="col-span-1 flex items-center">
              <Checkbox 
                checked={selectedOrders.includes(order.id)} 
                onCheckedChange={() => toggleSelectOrder(order.id)}
                aria-label={`Select order ${order.id}`}
              />
            </div>
            <div className="col-span-3">
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
            </div>
            <div className="col-span-2 text-xs text-muted-foreground capitalize">
              {order.table_number ? (order.table_number === 'Take Away' ? 'Take Away' : `Table ${order.table_number}`) : 'N/A'}
            </div>
            <div className="col-span-2 text-right">{formatThaiCurrency(order.total_amount)}</div>
            <div className="col-span-2 text-xs text-muted-foreground flex flex-col space-y-0.5 leading-tight">
              <span>{formatOrderDate(order.created_at)}</span>
              <span>{formatOrderTime(order.created_at)}</span>
            </div>
            <div className="col-span-2">
              <Select
                value={order.order_status || 'new'}
                onValueChange={(value: OrderStatus) => updateOrderStatus(order.id, value)}
              >
                <SelectTrigger className="w-full h-9 text-xs flex items-center gap-1.5 py-1">
                  {order.order_status && (
                    <>
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${getStatusColorDot(order.order_status)}`}></span>
                      <span className="capitalize">{order.order_status}</span>
                    </>
                  )}
                  {!order.order_status && <span className="text-muted-foreground">Select...</span>}
                </SelectTrigger>
                <SelectContent>
                  {orderStatusOptions.map(statusVal => (
                    <SelectItem key={statusVal} value={statusVal} className="flex items-center gap-2 text-xs capitalize">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${getStatusColorDot(statusVal)}`}></span>
                      {statusVal}
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
