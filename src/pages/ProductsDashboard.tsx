
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
import { formatThaiCurrency } from '@/lib/utils'; // Import the utility

interface Category {
  id: string;
  name: string;
}

interface ProductWithCategory extends Product {
  categories?: Category; // categories table has 'name', products has 'category_id'
}

const ProductsDashboard = () => {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null); // null for all, 'uncategorized', or category_id

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name') // Only select needed fields
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
        .select('*, categories(id, name)'); // Ensure relation name 'categories' is correct
      
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

  // Removed local formatPrice, using formatThaiCurrency from utils

  return (
    <Layout title="Products Dashboard" showBackButton={false}>
      <div className="container mx-auto py-6 px-4 md:px-0">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">Products</h1>
          <Button onClick={handleAddProduct}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
        
        <div className="mb-6">
          <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar"> {/* Added no-scrollbar helper if needed */}
            <Button
              variant={categoryFilter === null ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(null)}
              className="whitespace-nowrap"
            >
              All Products
            </Button>
            
            {categories?.map((category) => (
              <Button
                key={category.id}
                variant={categoryFilter === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(category.id)}
                className="whitespace-nowrap"
              >
                {category.name}
              </Button>
            ))}
            
            <Button
              variant={categoryFilter === 'uncategorized' ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter('uncategorized')}
              className="whitespace-nowrap"
            >
              Uncategorized
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => ( // Increased skeleton items for better visual
              <Card key={i} className="overflow-hidden">
                <div className="aspect-square bg-gray-200 animate-pulse"></div>
                <CardContent className="pt-4">
                  <div className="h-6 bg-gray-200 animate-pulse mb-2 w-3/4"></div>
                  <div className="h-5 bg-gray-200 animate-pulse w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
                onClick={() => navigate(`/products/edit/${product.id}`)}
              >
                <div className="relative aspect-square bg-gray-100 w-full">
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
                  
                  {product.categories && ( // Check if categories relation exists and has data
                    <span className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 text-xs rounded">
                      {product.categories.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-col flex-grow p-4">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-lg leading-tight" title={product.name}>{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-grow">
                    {/* Optional: Add description or other details here */}
                  </CardContent>
                  <CardFooter className="p-0 pt-3 flex justify-between items-center">
                    <span className="font-semibold text-primary text-md">
                      {formatThaiCurrency(product.price)}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click when clicking button
                        navigate(`/products/edit/${product.id}`);
                      }}
                    >
                      Edit
                    </Button>
                  </CardFooter>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <h3 className="text-xl font-medium text-gray-500 mb-1">
              {categoryFilter === 'uncategorized' ? "No Uncategorized Products" : categoryFilter && categories?.find(c => c.id === categoryFilter) ? `No Products in ${categories.find(c => c.id === categoryFilter)?.name}` : "No Products Found"}
            </h3>
            <p className="text-gray-400 mb-4">
              {categoryFilter ? "Try a different category or " : ""}
              Add a new product to get started.
            </p>
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

