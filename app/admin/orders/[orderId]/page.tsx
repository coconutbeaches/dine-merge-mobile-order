import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { useFetchOrderById } from '@/hooks/useFetchOrderById';
import { useOrderActions } from '@/hooks/useOrderActions';
import { Order, OrderStatus } from '@/types/app';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EditableOrderCard from '@/components/admin/EditableOrderCard';

const AdminOrderDetailContent = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { order, isLoading, error } = useFetchOrderById(orderId);
  const queryClient = useQueryClient();
  const { updateOrder, updateMultipleOrderStatuses } = useOrderActions(undefined);

  const handleOrderSave = (updatedOrder: Order) => {
    updateOrder(updatedOrder).then(() => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });
  };

  const handleStatusClick = (orderId: string, newStatus: OrderStatus) => {
    updateMultipleOrderStatuses([orderId], newStatus).then(() => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });
  };

  if (isLoading) {
    return <OrderDetailsSkeleton />;
  }

  if (error || !order) {
    return (
      <div>
        <DialogHeader>
          <DialogTitle>Error</DialogTitle>
          <DialogDescription>
            {error ? `Failed to load order: ${error.message}` : "The requested order could not be found."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <Button variant="outline" onClick={() => router.push('/orders-dashboard')}>
                Back to Dashboard
            </Button>
        </div>
      </div>
    );
  }

  return (
    <EditableOrderCard 
      order={order} 
      onOrderSave={handleOrderSave} 
      onStatusClick={handleStatusClick} 
      onClose={() => router.push('/orders-dashboard')}
    />
  );
};

const OrderDetailsSkeleton = () => (
    <>
        <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-7 w-24 rounded-md" />
        </div>
        <div className="mt-1 mb-6 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
        </div>
        <div className="my-6" />
        <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
        </div>
    </>
);

export default AdminOrderDetailContent;
