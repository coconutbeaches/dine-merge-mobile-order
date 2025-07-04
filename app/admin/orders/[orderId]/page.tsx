"use client";

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
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="relative max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <button
            onClick={() => router.push('/admin/orders')}
            className="absolute -top-4 -left-4 w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors z-60"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <OrderDetailsSkeleton />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="relative max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <button
            onClick={() => router.push('/admin/orders')}
            className="absolute -top-4 -left-4 w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors z-60"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              {error ? `Failed to load order: ${error.message}` : "The requested order could not be found."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
              <Button variant="outline" onClick={() => router.push('/admin/orders')}>
                  Back to Dashboard
              </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      {/* Modal content with white background */}
      <div className="relative max-w-md w-full bg-white rounded-lg shadow-lg">
        {/* Close button */}
        <button
          onClick={() => router.push('/admin/orders')}
          className="absolute -top-4 -left-4 w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors z-60"
          aria-label="Close"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        
        <EditableOrderCard 
          order={order} 
          onOrderSave={handleOrderSave} 
          onStatusClick={handleStatusClick} 
          onClose={() => router.push('/admin/orders')}
        />
      </div>
    </div>
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
