'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { formatThaiCurrency } from '@/lib/utils';
// Types for Next.js router
import { Product } from '@/types/supabaseTypes';

interface Category {
  id: string;
  name: string;
}

interface ProductWithCategory extends Product {
  categories?: Category;
}

interface ProductGridProps {
  products: ProductWithCategory[];
  isLoading: boolean;
  categoryFilter: string | null;
  categories: Category[];
  handleAddProduct: () => void;
  navigate: { push: (url: string) => void };
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading,
  categoryFilter,
  categories,
  handleAddProduct,
  navigate
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-square bg-gray-200 animate-pulse"></div>
            <CardContent className="pt-4">
              <div className="h-6 bg-gray-200 animate-pulse mb-2 w-3/4"></div>
              <div className="h-5 bg-gray-200 animate-pulse w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg border-dashed">
        <h3 className="text-xl font-medium text-gray-500 mb-1">
          {categoryFilter === 'uncategorized' ? 
            "No Uncategorized Products" : 
            categoryFilter && categories?.find(c => c.id === categoryFilter) ? 
            `No Products in ${categories.find(c => c.id === categoryFilter)?.name}` : 
            "No Products Found"}
        </h3>
        <p className="text-gray-400 mb-4">
          {categoryFilter ? "Try a different category or " : ""}
          Add a new product to get started.
        </p>
        <Button onClick={handleAddProduct}>
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <Card 
          key={product.id} 
          className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
          onClick={() => navigate.push(`/products/edit/${product.id}`)}
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
            
            {product.categories && (
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
            <CardFooter className="p-0 pt-3 flex justify-end items-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate.push(`/products/edit/${product.id}`);
                }}
              >
                Edit
              </Button>
            </CardFooter>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ProductGrid;
