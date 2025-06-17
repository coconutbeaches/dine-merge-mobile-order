import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/supabaseTypes';
import { formatThaiCurrency } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isLoggedIn,
    currentUser,
    setAdminCustomerContext,
    adminCustomerContext
  } = useAppContext();

  useEffect(() => {
    const navState = location.state as {
      adminCustomerId?: string;
      adminCustomerName?: string;
    };
    if (navState?.adminCustomerId && navState?.adminCustomerName) {
      if (!adminCustomerContext || adminCustomerContext.customerId !== navState.adminCustomerId) {
        console.log("Setting admin customer context from navigation state:", navState);
        setAdminCustomerContext({
          customerId: navState.adminCustomerId,
          customerName: navState.adminCustomerName,
        });
      }
    }
  }, [location.state, setAdminCustomerContext, adminCustomerContext]);
  
  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
        
      if (error) throw error;
      return data as Category[];
    },
  });
  
  // Fetch products with sort_order
  const { data: products } = useQuery({
    queryKey: ['index-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });
        
      if (error) throw error;
      return data as Product[];
    },
  });

  // Use the global Thai currency formatter (no decimals)
  const formatPrice = (price: number) => {
    return formatThaiCurrency(price);
  };
  
  return (
    <Layout>
      <div className="page-container">
        {/* Welcome Back - for logged in users */}
        {isLoggedIn && currentUser && (
          <div className="mb-6">
            <Card className="border border-gray-200">
              <div className="p-4">
                <h2 className="text-lg font-semibold">Welcome back, {currentUser.name.split(' ')[0]}!</h2>
                {adminCustomerContext && (
                  <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-3 rounded">
                    <p className="font-bold">Ordering for: {adminCustomerContext.customerName}</p>
                    <p className="text-sm">Items added to cart will be for this customer.</p>
                  </div>
                )}
                {currentUser.orderHistory && currentUser.orderHistory.length > 0 && (
                  <Button 
                    className="w-full border-black text-black hover:bg-gray-100" 
                    variant="outline"
                    onClick={() => navigate('/order-history')}
                  >
                    View Order History
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Categories with Black Headers */}
        {categories && products && categories.map((category) => {
          const categoryProducts = products.filter(product => product.category_id === category.id);
          if (categoryProducts.length === 0) return null;
          
          return (
            <div key={category.id} className="mb-8">
              <div className="category-header">
                {category.name}
              </div>
              <div className="menu-grid">
                {categoryProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="food-card cursor-pointer relative"
                    onClick={() => navigate(`/menu/item/${product.id}`)}
                  >
                    <div className="aspect-square overflow-hidden mb-2">
                      <img 
                        src={product.image_url || '/placeholder.svg'} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="menu-item-name">{product.name}</h3>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {/* Restaurant Info removed as requested */}
      </div>
    </Layout>
  );
};

export default Index;
