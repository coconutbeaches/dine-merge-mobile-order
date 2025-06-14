
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { useFetchOrderById } from '@/hooks/useFetchOrderById';
import { formatThaiCurrency, cn } from '@/lib/utils';
import { formatDetailedDateTime, getNewStatusBadgeClasses, orderStatusOptions } from '@/utils/orderDashboardUtils';
import { OrderStatus } from '@/types/supabaseTypes';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Hash, ShoppingCart, CircleUser } from 'lucide-react';

const AdminOrderDetail = () => {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Dialog open={true} onOpenChange={(isOpen) => !isOpen && navigate('/orders-dashboard')}>
                <DialogContent className="max-w-2xl">
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
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus, updated_at: new Date().toISOString() })
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
        <DialogTitle>Order #{String(order.id).padStart(4, '0')}</DialogTitle>
        <DialogDescription>
          Details for order placed on {formatDetailedDateTime(order.created_at)}.
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid gap-4 py-4">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{formatDetailedDateTime(order.created_at)}</span>
            </div>
            <Popover>
                <PopoverTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-sm font-medium capitalize cursor-pointer",
                        getNewStatusBadgeClasses(order.order_status)
                      )}
                    >
                      {order.order_status}
                    </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1">
                    <div className="flex flex-col gap-1">
                    {orderStatusOptions.map(status => (
                        <Button
                        key={status}
                        variant="ghost"
                        size="sm"
                        className="justify-start capitalize"
                        onClick={() => updateStatus(status)}
                        disabled={status === order.order_status || isUpdatingStatus}
                        >
                        {isUpdatingStatus && status === order.order_status ? 'Updating...' : status}
                        </Button>
                    ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
        
        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
                <CircleUser className="w-4 h-4 text-muted-foreground" />
                <strong>Customer:</strong> {order.customer_name || 'N/A'}
            </div>
            {order.table_number && (
                <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <strong>Table:</strong> {order.table_number}
                </div>
            )}
        </div>

        <div className="space-y-2 pt-2">
          <h4 className="font-semibold flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Items</h4>
          {order.order_items?.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span>{item.quantity}x {item.name || 'Unknown Product'}</span>
              <span className="font-medium">
                {formatThaiCurrency((item.price || 0) * item.quantity)}
              </span>
            </div>
          ))}
          {(!order.order_items || order.order_items.length === 0) && (
            <p className="text-muted-foreground text-sm">No items in this order.</p>
          )}
        </div>
        
        <Separator />

        <div className="flex justify-between items-center">
          <p className="text-lg font-bold">Total</p>
          <p className="text-lg font-bold">{formatThaiCurrency(order.total_amount)}</p>
        </div>
      </div>
    </>
  );
};

const OrderDetailsSkeleton = () => (
    <>
        <DialogHeader>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <Separator/>
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
            </div>
            <div className="space-y-2 pt-2">
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
            </div>
            <Separator/>
            <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-24" />
            </div>
        </div>
    </>
);

export default AdminOrderDetail;
