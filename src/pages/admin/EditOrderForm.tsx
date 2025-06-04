import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { adminUpdateOrderDetails } from '@/services/orderService'; // Will be created in this subtask
import { Order as SupabaseOrder, SupabaseOrderStatus, Profile } from '@/types/supabaseTypes'; // Assuming Order is the Supabase type for orders
import { format } from 'date-fns';
import { formatThaiCurrency } from '@/lib/utils';

// Define available order statuses for the dropdown
const orderStatusOptions: SupabaseOrderStatus[] = ["new", "confirmed", "completed", "delivered", "paid", "cancelled"];

const EditOrderForm = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<SupabaseOrder | null>(null);
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [currentStatus, setCurrentStatus] = useState<SupabaseOrderStatus | undefined>(undefined);
  const [tableNumber, setTableNumber] = useState<string>('');

  const [originalStatus, setOriginalStatus] = useState<SupabaseOrderStatus | undefined>(undefined);
  const [originalTableNumber, setOriginalTableNumber] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (orderId) {
      const fetchOrderDetails = async () => {
        setIsLoading(true);
        try {
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('*') // Fetch all columns for display and future use
            .eq('id', orderId)
            .single();

          if (orderError) throw orderError;
          if (!orderData) {
            toast.error('Order not found.');
            navigate(-1);
            return;
          }

          setOrder(orderData as SupabaseOrder);
          setCurrentStatus(orderData.order_status as SupabaseOrderStatus);
          setTableNumber(orderData.table_number || '');
          setOriginalStatus(orderData.order_status as SupabaseOrderStatus);
          setOriginalTableNumber(orderData.table_number || '');

          if (orderData.user_id) {
            const { data: customerData, error: customerError } = await supabase
              .from('profiles')
              .select('id, name, email')
              .eq('id', orderData.user_id)
              .single();
            if (customerError) {
                console.warn("Could not fetch customer details for order:", customerError.message);
            } else {
                setCustomer(customerData);
            }
          }

        } catch (error: any) {
          toast.error(`Failed to fetch order details: ${error.message}`);
          navigate(-1);
        } finally {
          setIsLoading(false);
        }
      };
      fetchOrderDetails();
    }
  }, [orderId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !order) return;

    const updates: { order_status?: SupabaseOrderStatus; table_number?: string } = {};
    if (currentStatus && currentStatus !== originalStatus) {
      updates.order_status = currentStatus;
    }
    if (tableNumber !== originalTableNumber) {
      updates.table_number = tableNumber;
    }

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setIsSaving(true);
    try {
      await adminUpdateOrderDetails(orderId, updates); // This function should show its own toasts
      // Update original values after successful save
      if(updates.order_status) setOriginalStatus(updates.order_status);
      if(updates.table_number !== undefined) setOriginalTableNumber(updates.table_number);
      toast.success("Order updated successfully!"); // Or rely on service's toast
    } catch (error) {
      // Error toast is expected from adminUpdateOrderDetails
      console.error("Failed to update order from form:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Layout title="Edit Order"><div className="p-4">Loading order details...</div></Layout>;
  }

  if (!order) {
    return <Layout title="Edit Order"><div className="p-4">Order data could not be loaded.</div></Layout>;
  }

  return (
    <Layout title="Edit Order Details" showBackButton={true}>
      {/* This console.log is for debugging purposes */}
      {console.log('Runtime orderStatusOptions:', JSON.stringify(orderStatusOptions))}
      <div className="page-container max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Order #{order.id.toString().padStart(4, '0')}</CardTitle>
            <CardDescription>
              Customer: {customer?.name || order.customer_name || 'N/A'} <br />
              Placed on: {format(new Date(order.created_at), 'MMM d, yyyy - h:mm a')} <br/>
              Total: {formatThaiCurrency(order.total_amount)}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="orderStatus">Order Status</Label>
                <Select
                  value={currentStatus}
                  onValueChange={(value) => setCurrentStatus(value as SupabaseOrderStatus)}
                  disabled={isSaving}
                >
                  <SelectTrigger id="orderStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatusOptions.map(status => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tableNumber">Table Number / Take Away</Label>
                <Input
                  id="tableNumber"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g., 15 or Take Away"
                  disabled={isSaving}
                />
              </div>
              {/* Future: Add order items editing here */}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-6">
              <Button variant="outline" type="button" onClick={() => navigate(-1)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || (currentStatus === originalStatus && tableNumber === originalTableNumber)}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default EditOrderForm;
