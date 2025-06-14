
import React, { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import AdminOrderCreator from '@/components/admin/AdminOrderCreator';
import { useOrdersDashboard } from '@/hooks/useOrdersDashboard';
import OrdersTableHeader from '@/components/admin/OrdersTableHeader';
import OrdersList from '@/components/admin/OrdersList';
import { orderStatusOptions } from '@/utils/orderDashboardUtils';
import { Trash, RefreshCw, Search } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { OrderStatus } from '@/types/supabaseTypes';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ALL_TAB = "all";

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
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<string>(ALL_TAB);

  const handleBulkStatusChange = (value: OrderStatus) => {
    setBulkStatus(value);
    if (selectedOrders.length === 0) return;
    updateMultipleOrderStatuses(selectedOrders, value);
  };

  // Filter logic: filter by search and by status (if status not "all")
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter if needed
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(order => {
        const name = (order.customer_name_from_profile || order.customer_name || "").toLowerCase();
        const email = (order.customer_email_from_profile || "").toLowerCase();
        // const phone = (order.phone || "").toLowerCase(); // field does not exist
        const orderIdStr = String(order.id);

        let containsProduct = false;
        if (Array.isArray(order.order_items)) {
          containsProduct = order.order_items.some((item: any) => {
            if (typeof item?.name === 'string') {
              return item.name.toLowerCase().includes(s);
            }
            return false;
          });
        }

        return (
          name.includes(s) ||
          email.includes(s) ||
          // phone.includes(s) ||
          orderIdStr.includes(s) ||
          containsProduct
        );
      });
    }

    // Apply status filter, unless "all" tab is active
    if (activeStatus !== ALL_TAB) {
      filtered = filtered.filter(order => order.order_status === activeStatus);
    }

    return filtered;
  }, [orders, search, activeStatus]);

  // TAB options: All + all status options in order
  const tabOptions = [
    { label: "All", value: ALL_TAB },
    ...orderStatusOptions.map(status => ({
      label: status === "delivery" ? "Delivery" : status.charAt(0).toUpperCase() + status.slice(1),
      value: status
    }))
  ];

  return (
    <Layout title="Orders Dashboard" showBackButton={false}>
      <div className="page-container p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          {/* Search field left, tools right */}
          <div className="flex-1 flex gap-2 items-center">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 pointer-events-none" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search orders (customer, order #, product)..."
                className="pl-9 pr-2 py-2 text-sm"
                type="search"
                aria-label="Search orders"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex gap-2 items-center">
              <AdminOrderCreator />
              <Select
                value={bulkStatus}
                onValueChange={handleBulkStatusChange}
                disabled={selectedOrders.length === 0 || isLoading}
              >
                <SelectTrigger className="w-28 h-9 text-sm font-medium border-gray-300 [&>span]:font-bold">
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
              <Button 
                variant="destructive" 
                disabled={selectedOrders.length === 0 || isLoading}
                onClick={deleteSelectedOrders}
                size="icon"
                aria-label="Delete selected"
              >
                <Trash size={18} />
              </Button>
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
        
        {/* Status Tabs */}
        <div className="mb-2">
          <Tabs value={activeStatus} onValueChange={setActiveStatus}>
            <TabsList className="w-full flex gap-1 bg-muted px-1 py-1 rounded-md border">
              {tabOptions.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 text-xs md:text-sm font-medium rounded-sm capitalize px-2 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
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
                orders={filteredOrders} 
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

