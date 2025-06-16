
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
// Card, CardContent, etc. are not directly used in this file, but ProductGrid might need them.
// For now, assume ProductGrid handles its own UI imports. If build errors occur, these might need to be re-added or confirmed.
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Product } from '@/types/supabaseTypes';
// formatThaiCurrency is likely used within ProductGrid, not directly here.
import ProductGrid from '@/components/admin/ProductGrid';
import ProductCategoryFilter from '@/components/admin/ProductCategoryFilter';
import { arrayMove } from '@dnd-kit/sortable';
import { DragEndEvent } from '@dnd-kit/core';

interface Category {
  id: string;
  name: string;
}

// Updated ProductWithCategory interface
interface ProductWithCategory extends Product {
  id: string; // Ensure id is non-optional
  name: string; // Ensure name is non-optional
  sort_order: number; // Expect sort_order to be a number after processing
  categories?: Category;
}

const ProductsDashboard = () => {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: categories } = useQuery<Category[], Error>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: productsData, isLoading, error: productsError } = useQuery<ProductWithCategory[], Error>({
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
        
      const { data, error } = await query.order('sort_order', { ascending: true, nullsFirst: false });

      if (error) {
        throw error;
      }
      // Process products to ensure they meet ProductWithCategory typing, especially non-nullable id, name, and numeric sort_order
      return (data || []).map((p, index) => ({
        ...p,
        id: p.id!,
        name: p.name!,
        // Assign index as sort_order if null, or use existing. This ensures client-side consistency.
        // The backend should ideally guarantee non-null sort_order for active products.
        sort_order: p.sort_order === null ? index : p.sort_order,
      })) as ProductWithCategory[];
    },
  });

  const products = productsData || [];

  const updateSortOrderMutation = useMutation({
    mutationFn: async (updates: Array<{ id: string; sort_order: number }>) => {
      // Ensure each product update is awaited
      for (const update of updates) {
        const { error } = await supabase
          .from('products')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
        if (error) {
          // Log the specific error for better debugging
          console.error(`Error updating product ${update.id}:`, error);
          throw new Error(`Failed to update product ${update.id}: ${error.message}`);
        }
      }
    },
    onSuccess: () => {
      toast.success('Product order updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['products', categoryFilter] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update product order: ${error.message}`);
      queryClient.invalidateQueries({ queryKey: ['products', categoryFilter] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!products || !over || active.id === over.id) {
      return;
    }

    const oldIndex = products.findIndex(p => p.id === active.id);
    const newIndex = products.findIndex(p => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      console.error('Draggable item or destination not found in products list.', { activeId: active.id, overId: over.id, productsList: products });
      toast.error("Error reordering products: Item not found.");
      return;
    }

    const newlyOrderedProducts = arrayMove(products, oldIndex, newIndex);

    // Optimistic update to UI
    queryClient.setQueryData<ProductWithCategory[]>(['products', categoryFilter], (oldData) => {
      if (!oldData) return []; // Should not happen if products are loaded
      const movedData = arrayMove(oldData, oldIndex, newIndex);
      // Update sort_order based on new position for the optimistic update
      return movedData.map((p, index) => ({ ...p, sort_order: index }));
    });

    const updates = newlyOrderedProducts.map((product, index) => ({
      id: product.id,
      sort_order: index, // Assign new sort_order based on the position in the array
    }));

    updateSortOrderMutation.mutate(updates);
  };

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
          products={products} // Pass the processed products
          isLoading={isLoading}
          categoryFilter={categoryFilter}
          categories={categories || []}
          handleAddProduct={handleAddProduct}
          navigate={navigate}
          handleDragEnd={handleDragEnd} // Pass the handler to the grid
        />
      </div>
    </Layout>
  );
};

export default ProductsDashboard;
