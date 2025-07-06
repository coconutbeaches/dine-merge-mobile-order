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

export default function OrderHistoryPage() {
  const router = useRouter();
  const { currentUser, isLoggedIn, isLoading: isLoadingUserContext } = useAppContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHotelGuest, setIsHotelGuest] = useState(false);
  const [guestSession, setGuestSession] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      
      try {
        // Check if user is a hotel guest
        if (hasGuestSession()) {
          const session = getGuestSession();
          setIsHotelGuest(true);
          setGuestSession(session);
          
          if (session) {
            // Fetch orders for hotel guests by stay_id
            const { data, error } = await supabase
              .from('orders')
              .select('*')
              .eq('stay_id', session.guest_stay_id)
              .order('created_at', { ascending: false });
            
            if (error) {
              console.error('Error fetching hotel guest orders:', error);
              toast.error('Failed to load your orders');
            } else {
              setOrders(data || []);
            }
          }
        } else if (isLoggedIn && currentUser) {
          // Fetch orders for regular authenticated users
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('Error fetching user orders:', error);
            toast.error('Failed to load your orders');
          } else {
            setOrders(data || []);
          }
        }
      } catch (error) {
        console.error('Error in fetchOrders:', error);
        toast.error('Failed to load your orders');
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch orders if we have either a logged in user or guest session
    if ((isLoggedIn && currentUser) || hasGuestSession()) {
      fetchOrders();
    } else if (!isLoadingUserContext) {
      // No guest session and not logged in - redirect to login
      router.push('/login?returnTo=/order-history');
    }
  }, [currentUser, isLoggedIn, isLoadingUserContext, router]);

  const handleStatusClick = (orderId: string, newStatus: OrderStatus) => {
    // For regular users viewing their own orders, don't allow status changes
    toast.info('Order status can only be changed by restaurant staff');
  };

  const handleOrderSave = (updatedOrder: Order) => {
    // For regular users viewing their own orders, don't allow editing
    toast.info('Orders can only be edited by restaurant staff');
  };

  const totalSpent = orders.reduce((total, order) => total + order.total_amount, 0);

  if (isLoadingUserContext || isLoading) {
    return (
      <Layout title="My Orders" showBackButton>
        <div className="page-container text-center py-10">
          <p>Loading your orders...</p>
        </div>
      </Layout>
    );
  }

  if (!isHotelGuest && (!isLoggedIn || !currentUser)) {
    return (
      <Layout title="My Orders" showBackButton>
        <div className="page-container text-center py-10">
          <p>Please log in to view your order history.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Orders" showBackButton>
      <div className="page-container p-4 md:p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-1">My Orders</h1>
          {isHotelGuest && guestSession && (
            <div className="text-sm text-muted-foreground mb-4">
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
