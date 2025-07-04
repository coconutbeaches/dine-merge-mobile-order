"use client";
// @ts-nocheck

import React, { useEffect, Suspense } from 'react';
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

  useEffect(() => {
    const adminCustomerId = searchParams?.get('adminCustomerId');
    const adminCustomerName = searchParams?.get('adminCustomerName');
    if (adminCustomerId && adminCustomerName) {
      if (!adminCustomerContext || adminCustomerContext.customerId !== adminCustomerId) {
        setAdminCustomerContext({ customerId: adminCustomerId, customerName: adminCustomerName });
      }
    }
  }, [searchParams, adminCustomerContext, setAdminCustomerContext]);

  const { data: categories, isLoading: catLoading, error: catError } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      console.log('Fetching categories...');
      const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      console.log('Categories result:', { data, error });
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: products, isLoading: prodLoading, error: prodError } = useQuery({
    queryKey: ['index-products'],
    queryFn: async () => {
      console.log('Fetching products...');
      const { data, error } = await supabase.from('products').select('*').order('sort_order', { ascending: true });
      console.log('Products result:', { data, error });
      if (error) throw error;
      return data as Product[];
    },
  });

  const { toast } = useToast();

  console.log('Loading states:', { catLoading, prodLoading, catError, prodError });
  console.log('Data:', { categories, products });

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
        <div className="page-container text-center py-10">
          <h2 className="text-xl font-bold mb-2">Hi! 👋 Welcome to Coconut Beach 🌴</h2>
          <p className="text-muted-foreground mb-6">Let's find you some yummy stuff to eat...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Menu">
      <div className="page-container">
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

        {categories?.map((cat) => {
          const items = products.filter((p) => p.category_id === cat.id);
          if (!items.length) return null;
          return (
            <div key={cat.id} className="mb-8">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 category-header">
                  {cat.name}
                </div>
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="food-card cursor-pointer"
                    onClick={() => router.push(`/menu/item/${p.id}`)}
                  >
                    <div className="menu-item-image">
                      <img 
                        src={p.image_url || '/placeholder.svg'} 
                        alt={p.name} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <h3 className="menu-item-name">{p.name}</h3>
                  </div>
                ))}
              </div>
              {cat.description && <p className="text-muted-foreground mt-1">{cat.description}</p>}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}

export default function MenuIndexPage() {
  return (
    <Suspense fallback={
      <Layout title="Menu" showBackButton>
        <div className="page-container text-center py-10">
          <h2 className="text-xl font-bold mb-2">Hi! 👋 Welcome to Coconut Beach 🌴</h2>
          <p className="text-muted-foreground mb-6">Let's find you some yummy stuff to eat...</p>
        </div>
      </Layout>
    }>
      <MenuIndexContent />
    </Suspense>
  );
}
