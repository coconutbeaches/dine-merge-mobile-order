
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Product } from '@/types/supabaseTypes';
import DraggableProductGrid from '@/components/admin/DraggableProductGrid';
import ProductCategoryFilter from '@/components/admin/ProductCategoryFilter';
import { useUserContext } from '@/context/UserContext';

interface Category {
  id: string;
  name: string;
}

interface ProductWithCategory extends Product {
  categories?: Category;
}

const ProductsDashboard = () => {
  const router = useRouter();
  const { currentUser } = useUserContext();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [localProducts, setLocalProducts] = useState<ProductWithCategory[]>([]);

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
        
      const { data, error } = await query.order('sort_order', { ascending: true });

      if (error) {
        throw error;
      }
      const result = data as ProductWithCategory[];
      setLocalProducts(result);
      return result;
    },
  });

  React.useEffect(() => {
    if (products) {
      setLocalProducts(products);
    }
  }, [products]);

  if (productsError) {
    toast.error(`Failed to load products: ${productsError.message}`);
    console.error('Error loading products:', productsError);
  }

  const handleAddProduct = () => {
    router.push('/products/new');
  };

  const handleProductsReorder = (reorderedProducts: ProductWithCategory[]) => {
    setLocalProducts(reorderedProducts);
  };

  const handleDeleteProduct = async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Error deleting product:', error);
      toast.error(`Failed to delete product: ${error.message}`);
    } else {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  };

  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin';

  return (
    <Layout title="Products Dashboard" showBackButton={false}>
      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">Products</h1>
            {isAdmin && (
              <p className="text-sm text-gray-600 mt-1">
                Drag the grip icon to reorder items within categories
              </p>
            )}
          </div>
          <Button onClick={handleAddProduct}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
        
        <ProductCategoryFilter
          categories={categories || []}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
        />
        
        {isAdmin ? (
          <DraggableProductGrid
            products={localProducts}
            isLoading={isLoading}
            categoryFilter={categoryFilter}
            categories={categories || []}
            handleAddProduct={handleAddProduct}
            navigate={router}
            onProductsReorder={handleProductsReorder}
            onProductDelete={handleDeleteProduct}
            isAdmin={isAdmin}
          />
        ) : (
          // Fallback to regular grid for non-admin users (though this page should be admin-only)
          <div className="text-center py-12">
            <p className="text-gray-500">Admin access required</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductsDashboard;
