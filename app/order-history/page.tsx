"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import CustomerOrdersList from '@/components/customer/CustomerOrdersList';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { getGuestSession, hasGuestSession } from '@/utils/guestSession';
import { formatThaiCurrency } from '@/lib/utils';
import { useUserOrders } from '@/hooks/useUserOrders'; // Import the hook

export default function OrderHistoryPage() {
  const router = useRouter();
  const { currentUser, isLoggedIn, isLoading: isLoadingUserContext } = useAppContext();

  // Use the hook for authenticated users
  const { orders: userOrders, isLoading: isLoadingUserOrders } = useUserOrders(currentUser?.id);

  const [guestOrders, setGuestOrders] = useState<Order[]>([]);
  const [isLoadingGuestOrders, setIsLoadingGuestOrders] = useState(false);
  const [isHotelGuest, setIsHotelGuest] = useState(false);
  const [guestSession, setGuestSession] = useState(null);

  useEffect(() => {
    if (hasGuestSession()) {
      const session = getGuestSession();
      setIsHotelGuest(true);
      setGuestSession(session);
      
      const fetchGuestOrders = async () => {
        if (session) {
          setIsLoadingGuestOrders(true);
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('stay_id', session.guest_stay_id)
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('Error fetching hotel guest orders:', error);
            toast.error('Failed to load your orders');
          } else {
            setGuestOrders(data || []);
          }
          setIsLoadingGuestOrders(false);
        }
      };
      fetchGuestOrders();
    }
  }, []);

  useEffect(() => {
    // Redirect if not loading, not a guest, and not logged in
    if (!isLoadingUserContext && !hasGuestSession() && !isLoggedIn) {
      router.push('/login?returnTo=/order-history');
    }
  }, [isLoggedIn, isLoadingUserContext, router]);

  const handleStatusClick = (orderId: string, newStatus: OrderStatus) => {
    toast.info('Order status can only be changed by restaurant staff');
  };

  const handleOrderSave = (updatedOrder: Order) => {
    toast.info('Orders can only be edited by restaurant staff');
  };

  const orders = isHotelGuest ? guestOrders : userOrders;
  const isLoading = isHotelGuest ? isLoadingGuestOrders : isLoadingUserOrders;

  const totalSpent = orders.reduce((total, order) => total + order.total_amount, 0);

  if (isLoadingUserContext || isLoading) {
    return (
      <Layout title="View Orders" showBackButton>
        <div className="page-container text-center py-10">
          <p>Loading your orders...</p>
        </div>
      </Layout>
    );
  }

  if (!isHotelGuest && (!isLoggedIn || !currentUser)) {
    return (
      <Layout title="View Orders" showBackButton>
        <div className="page-container text-center py-10">
          <p>Please log in to view your order history.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="View Orders" showBackButton>
      <div className="page-container p-4 md:p-6">
        <div className="mb-6 text-center">
          {isHotelGuest && guestSession && (
            <div 
              className="text-3xl font-bold cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => router.push('/profile')}
            >
              {guestSession.guest_stay_id.replace(/_/g, ' ')}
            </div>
          )}
          {orders.length > 0 && (
            <div className="bg-muted p-4 rounded-lg text-center max-w-sm mx-auto">
              <div className="text-2xl font-bold">{formatThaiCurrency(totalSpent)}</div>
              <div className="text-sm text-muted-foreground">{orders.length} order{orders.length !== 1 ? 's' : ''}</div>
            </div>
          )}
        </div>
        
        <CustomerOrdersList 
          orders={orders} 
          onStatusClick={handleStatusClick} 
          onOrderSave={handleOrderSave} 
        />
      </div>
    </Layout>
  );
}
