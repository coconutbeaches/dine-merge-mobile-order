import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { useOrdersDashboard } from '@/hooks/useOrdersDashboard';
import OrdersList from '@/components/admin/OrdersList';
import { orderStatusOptions } from '@/utils/orderDashboardUtils';
import { OrderStatus } from '@/types/supabaseTypes';
import OrdersDashboardHeader from '@/components/admin/OrdersDashboardHeader';
import StatusTabs from '@/components/admin/StatusTabs';
import { Loader2 } from 'lucide-react'; // For loading indicator

const ALL_TAB = "all";

const OrdersDashboard = () => {
  const { 
    orders, // Flattened list from useInfiniteQuery
    selectedOrders, 
    setSelectedOrders, // Added from useOrdersDashboard
    isLoading, // Initial loading state
    error, // Error state from useFetchOrders
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage, // Loading state for subsequent pages
    refetchOrders,
    updateOrderStatus,
    deleteSelectedOrders,
    toggleSelectOrder,
    updateMultipleOrderStatuses,
    selectAllOrders, // selectAllOrders from useOrderSelection now takes the current list
    clearSelection
  } = useOrdersDashboard();

  const [bulkStatus, setBulkStatus] = useState<OrderStatus | "">("");
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const [activeStatus, setActiveStatus] = useState<string>(ALL_TAB);

  const handleBulkStatusChange = (value: OrderStatus) => {
    setBulkStatus(value);
    if (selectedOrders.length === 0) return;
    updateMultipleOrderStatuses(selectedOrders, value);
    // selectedOrders will be cleared by useOrderActions if successful
  };

  const handleTabChange = (tabValue: string) => {
    if (tabValue === activeStatus) {
      // If clicking the active tab, consider deselecting it (show all)
      // Or keep it selected. Current logic: deselects to show ALL_TAB
      // setActiveStatus(ALL_TAB); // This might not be desired if a tab should remain active
      setActiveStatus(tabValue); // Keep tab active, filter logic handles it
    } else {
      setActiveStatus(tabValue);
    }
  };

  // The filtering logic now applies to the `orders` array,
  // which is the flattened list of all fetched orders.
  const filteredOrders = useMemo(() => {
    let currentOrders = orders;

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      currentOrders = currentOrders.filter(order => {
        const name = (order.customer_name_from_profile || order.customer_name || "").toLowerCase();
        const email = (order.customer_email_from_profile || "").toLowerCase();
        // Ensure order.id is treated as a string for .includes() if it's a number
        const orderIdStr = String(order.id);


        let containsProduct = false;
        if (Array.isArray(order.order_items)) {
          containsProduct = order.order_items.some((item: any) => {
            const itemName = item.product_name || item.name; // Assuming product_name might be available
            if (typeof itemName === 'string') {
              return itemName.toLowerCase().includes(s);
            }
            return false;
          });
        }

        return (
          name.includes(s) ||
          email.includes(s) ||
          orderIdStr.includes(s) || // Compare with string version of ID
          containsProduct
        );
      });
    }

    if (activeStatus !== ALL_TAB) {
      currentOrders = currentOrders.filter(order => order.order_status === activeStatus);
    }

    if (startDateParam) {
      const start = new Date(startDateParam);
      start.setHours(0, 0, 0, 0); // Ensure start of day
      currentOrders = currentOrders.filter(order => {
        const d = new Date(order.created_at);
        return d >= start;
      });
    }
    if (endDateParam) {
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999); // Ensure end of day
      currentOrders = currentOrders.filter(order => {
        const d = new Date(order.created_at);
        return d <= end;
      });
    }
    return currentOrders;
  }, [orders, search, activeStatus, startDateParam, endDateParam]);

  const tabOptions = [
    { label: "All", value: ALL_TAB },
    ...orderStatusOptions.map(status => ({
      label: status === "delivery" ? "Delivery" : status.charAt(0).toUpperCase() + status.slice(1),
      value: status
    }))
  ];

  if (error) {
    return (
      <Layout title="Orders Dashboard" showBackButton={false}>
        <div className="page-container p-4 md:p-6 text-center text-red-500">
          Error loading orders: {error.message}
          <Button onClick={() => refetchOrders()} className="ml-4">Try Again</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Orders Dashboard" showBackButton={false}>
      <div className="page-container p-4 md:p-6">
        <OrdersDashboardHeader
          search={search}
          setSearch={setSearch}
          bulkStatus={bulkStatus}
          handleBulkStatusChange={handleBulkStatusChange}
          selectedOrders={selectedOrders}
          isLoading={isLoading || isFetchingNextPage} // Combined loading state for header
          deleteSelectedOrders={deleteSelectedOrders}
          fetchOrders={refetchOrders} // Pass refetchOrders as fetchOrders
        />
        
        <StatusTabs 
          activeStatus={activeStatus}
          onTabChange={handleTabChange}
          tabOptions={tabOptions}
        />

        <Card>
          <CardContent className="p-0">
            {/* Show initial loading spinner only if orders array is empty */}
            {isLoading && orders.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground flex items-center justify-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading orders...
              </div>
            ) : (
              <OrdersList 
                orders={filteredOrders} 
                selectedOrders={selectedOrders}
                toggleSelectOrder={toggleSelectOrder}
                updateOrderStatus={updateOrderStatus}
                orderStatusOptions={orderStatusOptions}
                // selectAllOrders now correctly uses the filtered list from the UI
                selectAllOrders={() => selectAllOrders(filteredOrders.map(o => o.id))}
                clearSelection={clearSelection}
                // Pagination props
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default OrdersDashboard;
