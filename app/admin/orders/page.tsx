"use client";

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { useOrdersDashboard } from '@/hooks/useOrdersDashboard';
import OrdersList from '@/components/admin/OrdersList';
import { orderStatusOptions } from '@/utils/orderDashboardUtils';
import { OrderStatus } from '@/types/supabaseTypes';
import OrdersDashboardHeader from '@/components/admin/OrdersDashboardHeader';
import StatusTabs from '@/components/admin/StatusTabs';

const ALL_TAB = "all";

function OrdersDashboardContent() {
  const { 
    orders, 
    selectedOrders, 
    isLoading, 
    fetchOrders,
    updateOrderStatus,
    deleteSelectedOrders,
    toggleSelectOrder,
    updateMultipleOrderStatuses,
    selectAllOrders,
    clearSelection
  } = useOrdersDashboard();

  const [bulkStatus, setBulkStatus] = useState<OrderStatus | "">("");
  const [search, setSearch] = useState('');
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const customerParam = searchParams.get('customer');
  const [activeStatus, setActiveStatus] = useState<string>(ALL_TAB);
  
  // Set initial search if customer parameter is present
  const [initialSearchSet, setInitialSearchSet] = useState(false);

  useEffect(() => {
    if (customerParam && !initialSearchSet) {
      setSearch(customerParam);
      setInitialSearchSet(true);
    }
  }, [customerParam, initialSearchSet]);

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
            const itemName = item.product || item.name;
            if (typeof itemName === 'string') {
              return itemName.toLowerCase().includes(s);
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

    // Apply date-range filter from query params (inclusive)
    if (startDateParam) {
      const start = new Date(startDateParam);
      filtered = filtered.filter(order => {
        const d = new Date(order.created_at);
        return d >= start;
      });
    }
    if (endDateParam) {
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => {
        const d = new Date(order.created_at);
        return d <= end;
      });
    }

    return filtered;
  }, [orders, search, activeStatus, startDateParam, endDateParam]);

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
                selectAllOrders={() => selectAllOrders(filteredOrders.map(o => o.id))}
                clearSelection={clearSelection}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default function OrdersDashboardPage() {
  return (
    <Suspense fallback={
      <Layout title="Orders Dashboard" showBackButton={false}>
        <div className="page-container p-4 md:p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
              <p className="text-lg text-muted-foreground">Loading orders...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    }>
      <OrdersDashboardContent />
    </Suspense>
  );
}
