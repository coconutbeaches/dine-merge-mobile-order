"use client";
// @ts-nocheck

import React, { useEffect, Suspense, useMemo, useCallback, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { formatThaiCurrency } from '@/lib/utils';
import CustomOrderSection from '@/components/admin/CustomOrderSection';
import CategorySection from '@/components/menu/CategorySection';
import { CategorySkeleton } from '@/components/ui/skeleton/index';
import { getGuestSession, getRegistrationUrl } from '@/utils/guestSession';

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}
interface Product {
  id: string;
  name: string;
  image_url?: string | null;
  price?: number;
  category_id?: string | null;
}

function MenuIndexContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, currentUser, setAdminCustomerContext, adminCustomerContext } = useAppContext();

  const { toast } = useToast();

  // Guest session state
  const [guestSession, setGuestSession] = useState<ReturnType<typeof getGuestSession>>(null);
  
  // Track previous customerId to avoid infinite loops
  const prevCustomerIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Check if there's a goto parameter, which means TableScanRouter might still be processing
    const urlParams = new URLSearchParams(window.location.search);
    const hasGotoParam = urlParams.has('goto');
    
    const checkSession = () => {
      // Read guest session from localStorage
      const session = getGuestSession();
      
      if (session) {
        setGuestSession(session);
      } else if (!isLoggedIn) {
        // No guest session AND not logged in - redirect to registration
        const redirectUrl = getRegistrationUrl();
        console.log('MenuPage: No guest session and not logged in. Redirecting to registration:', redirectUrl);
        router.replace(redirectUrl);
      }
    };
    
    // If there's a goto parameter, wait a bit for TableScanRouter to process
    if (hasGotoParam) {
      console.log('MenuPage: Detected goto parameter, waiting for TableScanRouter...');
      setTimeout(checkSession, 200);
    } else {
      checkSession();
    }
  }, [router, isLoggedIn]); // Run once on mount and when login status changes

  useEffect(() => {
    const customerId = searchParams?.get('customerId');
    
    // Only process if customerId has changed
    if (customerId !== prevCustomerIdRef.current) {
      prevCustomerIdRef.current = customerId;
      
      if (customerId) {
        // Determine if this is a UUID (auth user) or stay_id (hotel guest)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
        
        if (isUUID) {
          // Fetch customer details from profiles for regular users
          const fetchCustomerDetails = async () => {
            const { data, error } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', customerId)
              .single();
            
            if (error) {
              console.error('Error fetching customer details for admin context:', error);
              toast.error('Failed to load customer details for order creation.');
              return;
            }

            if (data) {
              setAdminCustomerContext({ customerId: customerId, customerName: data.name || 'Unknown Customer' });
            }
          };
          fetchCustomerDetails();
        } else {
          // For hotel guests (stay_id), use the stay_id as the customer name with spaces
          const customerName = customerId.replace(/_/g, ' ');
          setAdminCustomerContext({ customerId: customerId, customerName: customerName });
        }
      } else {
        // Clear adminCustomerContext if no customerId is in the URL
        setAdminCustomerContext(null);
      }
    }
  }, [searchParams, setAdminCustomerContext, toast]);

  // Optimized queries with better caching and stale time
  const { data: categories, isLoading: catLoading, error: catError } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const { data: products, isLoading: prodLoading, error: prodError } = useQuery({
    queryKey: ['menu-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, price, category_id')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  // Memoized categories with products for better performance
  const categoriesWithProducts = useMemo(() => {
    if (!categories || !products) return [];
    
    return categories
      .map((cat) => {
        const items = products.filter((p) => p.category_id === cat.id);
        return {
          ...cat,
          items,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categories, products]);

  if (process.env.NODE_ENV === 'development') {
    console.log('Loading states:', { catLoading, prodLoading, catError, prodError });
    console.log('Data:', { categories, products });
  }

  if (catError || prodError) {
    return (
      <Layout title="Menu" showBackButton>
        <div className="page-container py-8">
          <div className="text-red-600">
            Error loading menu: {catError?.message || prodError?.message}
          </div>
        </div>
      </Layout>
    );
  }

  if (catLoading || prodLoading) {
    return (
      <Layout title="Menu" showBackButton>
        <div className="page-container">
          <div className="text-center py-4">
            <div className="text-lg leading-relaxed">
              <div className="mb-2">Hi! 👋 Welcome to Coconut Beach 🌴</div>
              <div className="mb-6">Loading menu...</div>
            </div>
          </div>
          {/* Show skeleton while loading */}
          {[...Array(3)].map((_, i) => (
            <CategorySkeleton key={i} />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Menu">
      <div className="page-container">
        {/* Conditional Welcome Message for Guests */}
        {guestSession && (
          <div className="mb-6">
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold">
                  Welcome, {guestSession.guest_first_name}!
                </h2>
                <p className="text-sm text-gray-600">Ready to order?</p>
                <p className="text-xs text-gray-400">Room: {guestSession.guest_stay_id}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoggedIn && currentUser && (
          <div className="mb-6">
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold">
                  Welcome back, {currentUser.name.split(' ')[0]}!
                </h2>
                {adminCustomerContext && (
                  <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-3 rounded">
                    <p className="font-bold">
                      Ordering for: {adminCustomerContext.customerName}
                    </p>
                  </div>
                )}
                {currentUser.orderHistory?.length > 0 && (
                  <Button variant="outline" onClick={() => router.push('/order-history')}>
                    View Order History
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {currentUser?.role === 'admin' && adminCustomerContext && (
          <CustomOrderSection customerId={adminCustomerContext.customerId} customerName={adminCustomerContext.customerName} />
        )}

        {categoriesWithProducts.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}
      </div>
    </Layout>
  );
}

export default function MenuIndexPage() {
  return (
    <Suspense fallback={
      <Layout title="Menu" showBackButton>
        <div className="page-container text-center py-10">
          <div className="text-lg leading-relaxed">
            <div className="mb-2">Hi! 👋 Welcome to Coconut Beach 🌴</div>
            <div className="mb-2">Let's find you some yummy stuff to eat...</div>
            <div className="mb-6">Menu will load here shortly 🙏🏼</div>
          </div>
        </div>
      </Layout>
    }>
      <MenuIndexContent />
    </Suspense>
  );
}
