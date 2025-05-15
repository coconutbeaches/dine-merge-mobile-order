
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Product } from '@/types/supabaseTypes';
import { formatThaiCurrency } from '@/lib/utils';
import ProductGrid from '@/components/admin/ProductGrid';
import ProductCategoryFilter from '@/components/admin/ProductCategoryFilter';

interface Category {
  id: string;
  name: string;
}

interface ProductWithCategory extends Product {
  categories?: Category;
}

const ProductsDashboard = () => {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null); // null for all, 'uncategorized', or category_id

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('sort_order', { ascending: true });
        
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: products, isLoading, error: productsError } = useQuery<ProductWithCategory[], Error>({
    queryKey: ['products', categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, categories(id, name)');
      
      if (categoryFilter === 'uncategorized') {
        query = query.is('category_id', null);
      } else if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }
        
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      return data as ProductWithCategory[];
    },
  });

  if (productsError) {
    toast.error(`Failed to load products: ${productsError.message}`);
    console.error('Error loading products:', productsError);
  }

  const handleAddProduct = () => {
    navigate('/products/new');
  };

  return (
    <Layout title="Products Dashboard" showBackButton={false}>
      <div className="container mx-auto py-6 px-4 md:px-0">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">Products</h1>
          <Button onClick={handleAddProduct}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
        
        <ProductCategoryFilter
          categories={categories || []}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
        />
        
        <ProductGrid
          products={products || []}
          isLoading={isLoading}
          categoryFilter={categoryFilter}
          categories={categories || []}
          handleAddProduct={handleAddProduct}
          navigate={navigate}
        />
      </div>
    </Layout>
  );
};

export default ProductsDashboard;
