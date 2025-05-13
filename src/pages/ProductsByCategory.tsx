
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Product } from '@/types/supabaseTypes';
import { Plus } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
}

const ProductsByCategory = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch category
  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();
        
      if (error) throw error;
      return data as Category;
    },
  });

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products-by-category', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', categoryId);
        
      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch all products without a category
  const { data: uncategorizedProducts, isLoading: uncategorizedLoading } = useQuery({
    queryKey: ['uncategorized-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .is('category_id', null);
        
      if (error) throw error;
      return data as Product[];
    },
  });

  // Add product to this category mutation
  const addToCategoryMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({ category_id: categoryId })
        .eq('id', productId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-by-category', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['uncategorized-products'] });
      toast.success('Product added to category');
    },
    onError: (error) => {
      toast.error(`Error adding product to category: ${error.message}`);
    },
  });

  // Remove product from category mutation
  const removeFromCategoryMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({ category_id: null })
        .eq('id', productId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-by-category', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['uncategorized-products'] });
      toast.success('Product removed from category');
    },
    onError: (error) => {
      toast.error(`Error removing product from category: ${error.message}`);
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(price);
  };

  const isLoading = categoryLoading || productsLoading || uncategorizedLoading;

  if (isLoading) {
    return <Layout title="Loading..."><div className="container mx-auto py-6">Loading...</div></Layout>;
  }

  if (!category) {
    return <Layout title="Category Not Found"><div className="container mx-auto py-6">Category not found</div></Layout>;
  }

  return (
    <Layout title={`Products in ${category.name}`} showBackButton>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{category.name}</h1>
            {category.description && (
              <p className="text-muted-foreground mt-1">{category.description}</p>
            )}
          </div>
          <Button onClick={() => navigate('/products/new')}>
            <Plus className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Products in this category</CardTitle>
          </CardHeader>
          <CardContent>
            {products && products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <div className="aspect-square bg-gray-100">
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
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">{product.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="justify-between pt-0">
                      <span className="font-medium text-primary">
                        {formatPrice(product.price)}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/products/edit/${product.id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCategoryMutation.mutate(product.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No products in this category yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uncategorized Products</CardTitle>
          </CardHeader>
          <CardContent>
            {uncategorizedProducts && uncategorizedProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {uncategorizedProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <div className="aspect-square bg-gray-100">
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
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">{product.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="justify-between pt-0">
                      <span className="font-medium text-primary">
                        {formatPrice(product.price)}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/products/edit/${product.id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => addToCategoryMutation.mutate(product.id)}
                        >
                          Add to Category
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No uncategorized products found</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button
            variant="outline"
            onClick={() => navigate('/categories-manager')}
          >
            Back to Categories
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default ProductsByCategory;
