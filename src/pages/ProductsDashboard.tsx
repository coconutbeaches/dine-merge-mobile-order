
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Product } from '@/types/supabaseTypes';

const ProductsDashboard = () => {
  const navigate = useNavigate();

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      return data as Product[];
    }
  });

  if (error) {
    toast.error('Failed to load products');
    console.error('Error loading products:', error);
  }

  const handleAddProduct = () => {
    navigate('/products/new');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <Layout title="Products Dashboard">
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Products</h1>
          <Button onClick={handleAddProduct}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="relative overflow-hidden">
                <div className="h-48 bg-gray-200 animate-pulse"></div>
                <CardContent className="pt-4">
                  <div className="h-6 bg-gray-200 animate-pulse mb-2"></div>
                  <div className="h-5 bg-gray-200 animate-pulse w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/products/${product.id}`)}
              >
                <div className="relative h-48 bg-gray-100">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <CardHeader className="pt-3 pb-2">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </CardHeader>
                <CardFooter className="justify-between pt-0">
                  <span className="font-medium text-primary">
                    {formatPrice(product.price)}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/products/edit/${product.id}`);
                    }}
                  >
                    Edit
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <h3 className="text-xl font-medium text-gray-500">No products found</h3>
            <p className="text-gray-400 mb-4">Get started by creating a new product</p>
            <Button onClick={handleAddProduct}>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductsDashboard;
