
import React, { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useOrdersDashboard } from '@/hooks/useOrdersDashboard';
import OrdersTableHeader from '@/components/admin/OrdersTableHeader';
import OrdersList from '@/components/admin/OrdersList';
import { orderStatusOptions } from '@/utils/orderDashboardUtils';
import { OrderStatus } from '@/types/supabaseTypes';
import OrdersDashboardHeader from '@/components/admin/OrdersDashboardHeader';
import StatusTabs from '@/components/admin/StatusTabs';

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

  const handleTabChange = (tabValue: string) => {
    if (tabValue === activeStatus) {
      setActiveStatus(ALL_TAB);
    } else {
      setActiveStatus(tabValue);
    }
  };

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

    if (activeStatus !== ALL_TAB) {
      filtered = filtered.filter(order => order.order_status === activeStatus);
    }

    return filtered;
  }, [orders, search, activeStatus]);

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
        <OrdersDashboardHeader
          search={search}
          setSearch={setSearch}
          bulkStatus={bulkStatus}
          handleBulkStatusChange={handleBulkStatusChange}
          selectedOrders={selectedOrders}
          isLoading={isLoading}
          deleteSelectedOrders={deleteSelectedOrders}
          fetchOrders={fetchOrders}
        />
        
        <StatusTabs 
          activeStatus={activeStatus}
          onTabChange={handleTabChange}
          tabOptions={tabOptions}
        />

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
