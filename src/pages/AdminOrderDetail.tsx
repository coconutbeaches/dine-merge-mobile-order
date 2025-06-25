import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { useFetchOrderById } from '@/hooks/useFetchOrderById';
import { formatThaiCurrency, cn } from '@/lib/utils';
import { formatOrderDateTime, getStatusBadgeClasses, getStatusBadgeHoverClasses, mapOrderStatusToSupabase } from '@/utils/orderDashboardUtils';
import { Order, OrderStatus } from '@/types/app';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const AdminOrderDetail = () => {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Dialog open={true} onOpenChange={(isOpen) => !isOpen && navigate('/orders-dashboard')}>
                <DialogContent className="max-w-md">
                    <AdminOrderDetailContent />
                </DialogContent>
            </Dialog>
        </div>
    );
};

const AdminOrderDetailContent = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { order, isLoading, error } = useFetchOrderById(orderId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: updateStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: async (newStatus: OrderStatus) => {
      if (!order) return;
      const supabaseStatus = mapOrderStatusToSupabase(newStatus);
      const { error } = await supabase
        .from('orders')
        .update({ order_status: supabaseStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (error) throw new Error(error.message);
      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast.success(`Order status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
  
  const statusSequence: OrderStatus[] = ['new', 'preparing', 'ready', 'delivery', 'completed', 'paid', 'cancelled'];
  const currentStatusIndex = order ? statusSequence.indexOf(order.order_status) : -1;
  const canBeAdvanced = currentStatusIndex > -1 && currentStatusIndex < statusSequence.length - 1;

  const handleStatusUpdate = () => {
    if (order && canBeAdvanced && !isUpdatingStatus) {
      const nextStatus = statusSequence[currentStatusIndex + 1];
      updateStatus(nextStatus);
    }
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
            <Button variant="outline" onClick={() => navigate('/orders-dashboard')}>
                Back to Dashboard
            </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex justify-between items-center">
            <span className="text-2xl font-bold">Order #{String(order.id).padStart(4, '0')}</span>
            <Badge
                variant="default"
                className={cn(
                    "text-sm font-semibold capitalize px-3 py-1",
                    getStatusBadgeClasses(order.order_status),
                    canBeAdvanced && "cursor-pointer transition-colors",
                    canBeAdvanced && getStatusBadgeHoverClasses(order.order_status),
                    isUpdatingStatus && "cursor-wait"
                )}
                onClick={handleStatusUpdate}
            >
                {isUpdatingStatus ? 'Updating...' : order.order_status}
            </Badge>
        </DialogTitle>
        <DialogDescription asChild>
            <div className="text-sm text-muted-foreground mt-1 mb-6 text-left">
                <div>{formatOrderDateTime(order.created_at)}</div>
                {order.table_number && <div>Table {order.table_number}</div>}
            </div>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        {order.order_items?.map((item, index) => (
            <div key={item.id || index} className="space-y-1">
                <div className="flex justify-between items-center text-base">
                    <span>{item.quantity}x {item.name || 'Unknown Product'}</span>
                    <span className="font-regular">
                    {formatThaiCurrency((item.price || 0) * item.quantity)}
                    </span>
                </div>
                {item.optionsString && (
                    <div className="text-sm text-muted-foreground pl-5">
                        {item.optionsString}
                    </div>
                )}
            </div>
        ))}
        {(!order.order_items || order.order_items.length === 0) && (
          <p className="text-muted-foreground text-sm">No items in this order.</p>
        )}
      </div>
      
      <Separator className="my-6" />

      <div className="flex justify-between items-center">
        <p className="text-lg font-bold">Total</p>
        <p className="text-lg font-bold">{formatThaiCurrency(order.total_amount)}</p>
      </div>
    </>
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
        <Separator className="my-6" />
        <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
        </div>
    </>
);

export default AdminOrderDetail;
