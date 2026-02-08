"use client";

import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { useFetchOrdersOptimized } from '@/src/hooks/useFetchOrdersOptimized';
import OrdersList from '@/components/admin/OrdersList';
import { orderStatusOptions } from '@/utils/orderDashboardUtils';
import { OrderStatus } from '@/types/supabaseTypes';
import OrdersDashboardHeader from '@/components/admin/OrdersDashboardHeader';
import StatusTabs from '@/components/admin/StatusTabs';
import DailySalesSummary from '@/src/components/admin/DailySalesSummary';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ALL_TAB = "all";

function OrdersDashboardContent() {
  const { 
    orders, 
    setOrders,
    isLoading, 
    isLoadingMore,
    error,
    hasMore,
    fetchOrders,
    loadMore,
    setFilters
  } = useFetchOrdersOptimized();

  // Import order selection and actions hooks separately
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  
  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };
  
  const selectAllOrders = (orderIds: string[]) => {
    setSelectedOrders(orderIds);
  };
  
  const clearSelection = () => {
    setSelectedOrders([]);
  };
  
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus })
        .eq('id', orderId);
      if (error) throw error;
      
      // Update local state immediately for better UX
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === parseInt(orderId) ? { ...order, order_status: newStatus } : order
        )
      );
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update order: ${message}`);
    }
  };
  
  const updateMultipleOrderStatuses = async (orderIds: string[], newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus })
        .in('id', orderIds.map(id => parseInt(id)));
      if (error) throw error;
      
      // Update local state immediately for better UX
      setOrders(prevOrders => 
        prevOrders.map(order => 
          orderIds.includes(order.id.toString()) ? { ...order, order_status: newStatus } : order
        )
      );
      toast.success(`${orderIds.length} orders updated to ${newStatus}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update orders: ${message}`);
    }
  };
  
  const deleteSelectedOrders = async () => {
    if (selectedOrders.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', selectedOrders.map(id => parseInt(id)));
      if (error) throw error;
      
      // Update local state immediately for better UX
      setOrders(prevOrders => 
        prevOrders.filter(order => !selectedOrders.includes(order.id.toString()))
      );
      setSelectedOrders([]);
      toast.success(`${selectedOrders.length} orders deleted`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete orders: ${message}`);
    }
  };

  const [bulkStatus, setBulkStatus] = useState<OrderStatus | "">("");
  const [search, setSearch] = useState('');
  const [startDateParam, setStartDateParam] = useState<string | null>(null);
  const [endDateParam, setEndDateParam] = useState<string | null>(null);
  const [customerParam, setCustomerParam] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string>(ALL_TAB);
  const lastAppliedFilterKeyRef = useRef<string>('');
  
  // Set initial search if customer parameter is present
  const [initialSearchSet, setInitialSearchSet] = useState(false);

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setStartDateParam(params.get('startDate'));
      setEndDateParam(params.get('endDate'));
      setCustomerParam(params.get('customer'));
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    if (customerParam && !initialSearchSet) {
      setSearch(customerParam);
      setInitialSearchSet(true);
    }
  }, [customerParam, initialSearchSet]);

  // Apply filters server-side with debounce to reduce load
  useEffect(() => {
    const timer = setTimeout(() => {
      const nextFilters = {
        search: search.trim() || undefined,
        status: activeStatus !== ALL_TAB ? activeStatus : undefined,
        startDate: startDateParam || undefined,
        endDate: endDateParam || undefined,
      };

      const nextKey = JSON.stringify(nextFilters);
      if (nextKey === lastAppliedFilterKeyRef.current) {
        return;
      }

      lastAppliedFilterKeyRef.current = nextKey;
      setFilters(nextFilters);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, activeStatus, startDateParam, endDateParam, setFilters]);

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

        <DailySalesSummary />

        <Card>
          <CardContent className="p-0">
            {error && !isLoading && (
              <div className="p-4 border-b bg-red-50 text-red-700 text-sm flex items-center justify-between">
                <span>{error}</span>
                <button
                  className="underline font-medium"
                  onClick={fetchOrders}
                  type="button"
                >
                  Retry
                </button>
              </div>
            )}
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading orders...</div>
            ) : (
              <OrdersList 
                orders={orders}
                selectedOrders={selectedOrders}
                toggleSelectOrder={toggleSelectOrder}
                updateOrderStatus={updateOrderStatus}
                orderStatusOptions={orderStatusOptions}
                selectAllOrders={() => selectAllOrders(orders.map(o => o.id))}
                clearSelection={clearSelection}
                onLoadMore={loadMore}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default function OrdersDashboardPage() {
  return <OrdersDashboardContent />;
}
