import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { restaurantInfo } from '@/data/mockData';
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
  const { isLoggedIn, currentUser } = useAppContext();
  
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
  
  // Fetch products
  const { data: products } = useQuery({
    queryKey: ['index-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*');
        
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
                <p className="text-sm text-gray-600 mb-3">Ready to order your favorites?</p>
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
          const categoryProducts = products.filter(product => product.category_id === category.id).slice(0, 4);
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
                    <p className="menu-item-price">{formatPrice(product.price)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/menu?category=${category.id}`)}
                  className="border-black text-black hover:bg-gray-100"
                >
                  See All {category.name}
                </Button>
              </div>
            </div>
          );
        })}
        
        {/* Restaurant Info */}
        <div className="mb-6">
          <h2 className="section-heading">Restaurant Info</h2>
          <Card className="border border-gray-200">
            <div className="p-4">
              <div className="space-y-2">
                <div>
                  <strong className="text-sm">Address:</strong>
                  <p className="text-sm">{restaurantInfo.address.street}, {restaurantInfo.address.city}</p>
                </div>
                <div>
                  <strong className="text-sm">Phone:</strong>
                  <p className="text-sm">{restaurantInfo.phone}</p>
                </div>
                <div>
                  <strong className="text-sm">Hours Today:</strong>
                  <p className="text-sm">
                    {restaurantInfo.hours[Object.keys(restaurantInfo.hours)[0]].open} - 
                    {restaurantInfo.hours[Object.keys(restaurantInfo.hours)[0]].close}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
