
import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import AdminOrderCreator from '@/components/admin/AdminOrderCreator';
import { useOrdersDashboard } from '@/hooks/useOrdersDashboard';
import OrdersTableHeader from '@/components/admin/OrdersTableHeader';
import OrdersList from '@/components/admin/OrdersList';
import { orderStatusOptions } from '@/utils/orderDashboardUtils';
import { Trash, RefreshCw } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { OrderStatus } from '@/types/supabaseTypes';

const OrdersDashboard = () => {
  const { 
    orders, 
    selectedOrders, 
    isLoading, 
    fetchOrders,
    updateOrderStatus,
    deleteSelectedOrders,
    toggleSelectOrder,
    selectAllOrders,
    updateMultipleOrderStatuses
  } = useOrdersDashboard();

  const [bulkStatus, setBulkStatus] = useState<OrderStatus | "">("");

  const handleBulkStatusChange = (value: OrderStatus) => {
    setBulkStatus(value);
    if (selectedOrders.length === 0) return;
    updateMultipleOrderStatuses(selectedOrders, value);
  }

  return (
    <Layout title="Orders Dashboard" showBackButton={false}>
      <div className="page-container p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          {/* Remove duplicated highlighted Orders Dashboard text */}
          <h1 className="text-xl font-bold">Orders Dashboard</h1>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex gap-2 items-center">
              <AdminOrderCreator>
                {/*
                  Make "+ New Order" button less wide using smaller size and min-w-28 (~7rem) for a more compact look.
                  You may also override built-in padding with px-3 (if needed)
                */}
                <Button className="min-w-28 px-3" size="sm">
                  + New Order
                </Button>
              </AdminOrderCreator>
              <Select 
                value={bulkStatus}
                onValueChange={handleBulkStatusChange}
                disabled={selectedOrders.length === 0 || isLoading}
              >
                <SelectTrigger className="w-32 h-9 text-sm font-medium border-gray-300 [&>span]:font-bold">
                  <SelectValue placeholder="Bulk Status" />
                </SelectTrigger>
                <SelectContent>
                  {orderStatusOptions.map(status => (
                    <SelectItem 
                      key={status} 
                      value={status} 
                      className="capitalize text-xs"
                    >
                      {status === 'delivery' ? 'Delivery' : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Bulk delete button */}
              <Button 
                variant="destructive" 
                disabled={selectedOrders.length === 0 || isLoading}
                onClick={deleteSelectedOrders}
                size="icon"
                aria-label="Delete selected"
              >
                <Trash size={18} />
              </Button>
              {/* Refresh button - fits on same row */}
              <Button 
                onClick={fetchOrders} 
                disabled={isLoading}
                size="icon"
                variant="secondary"
                aria-label="Refresh"
              >
                <RefreshCw size={18} />
              </Button>
            </div>
          </div>
        </div>
        <Card>
          <CardHeader className="bg-muted/50 p-3">
            <OrdersTableHeader 
              selectAllOrders={selectAllOrders}
              selectedOrdersCount={selectedOrders.length}
              totalOrdersCount={orders.length}
            />
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading orders...</div>
            ) : (
              <OrdersList 
                orders={orders} 
                selectedOrders={selectedOrders}
                toggleSelectOrder={toggleSelectOrder}
                updateOrderStatus={updateOrderStatus}
                orderStatusOptions={orderStatusOptions}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default OrdersDashboard;

