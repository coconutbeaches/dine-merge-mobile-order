'use client';
import React from 'react';
import { Button } from '@/components/ui/button';

interface Category {
  id: string;
  name: string;
}

interface ProductCategoryFilterProps {
  categories: Category[];
  categoryFilter: string | null;
  setCategoryFilter: (filter: string | null) => void;
}

const ProductCategoryFilter: React.FC<ProductCategoryFilterProps> = ({
  categories,
  categoryFilter,
  setCategoryFilter
}) => {
  return (
    <div className="mb-6">
      <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
        <Button
          variant={categoryFilter === null ? "default" : "outline"}
          size="sm"
          onClick={() => setCategoryFilter(null)}
          className="whitespace-nowrap"
        >
          All Products
        </Button>
        
        {categories.map((category) => (
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
  );
};

export default ProductCategoryFilter;
