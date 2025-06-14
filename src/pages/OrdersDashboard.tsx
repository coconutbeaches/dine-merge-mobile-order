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

  // New logic for toggling status tabs: clicking a selected tab will deselect it ("All")
  const handleTabChange = (tabValue: string) => {
    if (tabValue === activeStatus) {
      setActiveStatus(""); // if selected again, deselect all/show all
    } else {
      setActiveStatus(tabValue);
    }
  };

  // Filter logic: show all if no status selected
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(order => {
        const name = (order.customer_name_from_profile || order.customer_name || "").toLowerCase();
        const email = (order.customer_email_from_profile || "").toLowerCase();
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
          orderIdStr.includes(s) ||
          containsProduct
        );
      });
    }

    if (activeStatus) {
      filtered = filtered.filter(order => order.order_status === activeStatus);
    }

    return filtered;
  }, [orders, search, activeStatus]);

  // Only individual statuses, no ALL tab anymore
  const tabOptions = orderStatusOptions.map(status => ({
    label: status === "delivery" ? "Delivery" : status.charAt(0).toUpperCase() + status.slice(1),
    value: status
  }));

  return (
    <Layout title="Orders Dashboard" showBackButton={false}>
      <div className="page-container p-4 md:p-6">
        {/* Search and action buttons */}
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
        
        {/* Status Tabs - smaller and no "All" option */}
        <div className="mb-2 overflow-x-auto">
          <Tabs value={activeStatus} onValueChange={handleTabChange}>
            <TabsList
              className="w-full flex gap-1 bg-muted px-1 py-1 rounded-md border overflow-x-auto no-scrollbar"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {tabOptions.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={`flex-1 min-w-[54px] max-w-[84px] text-xs md:text-xs font-semibold rounded px-1 py-1 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors focus-visible:outline-none`}
                  style={{ flexBasis: "0", flexGrow: 1, flexShrink: 1, whiteSpace: "nowrap" }}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Orders table */}
        <Card>
          <CardHeader className="bg-muted/50 p-3">
            {/* Table header: Remove Table heading, adjust Amount and Date */}
            <div
              className="grid grid-cols-12 gap-x-1 md:gap-x-3 items-center text-xs font-bold text-muted-foreground"
              style={{
                // min-content (checkbox), 2.5fr (customer), 1.1fr (amount), 1.3fr (date), 3fr (status) - adjusted for space
                gridTemplateColumns: "min-content minmax(0,2.5fr) minmax(0,1.1fr) minmax(0,1.3fr) min-content min-content min-content min-content min-content min-content min-content min-content min-content"
              }}
            >
              <div className="col-span-1" />
              <div className="col-span-3">Customer</div>
              <div className="col-span-2 text-right pr-5">Amount</div>
              <div className="col-span-2 text-left">Date</div>
              {/* Removed "Table" header */}
              <div className="col-span-3 text-left">Status</div>
            </div>
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
