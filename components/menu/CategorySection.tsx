import React, { memo } from 'react';
import MenuItemCard from './MenuItemCard';

interface Product {
  id: string;
  name: string;
  image_url?: string | null;
  price?: number;
  category_id?: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  items: Product[];
}

interface CategorySectionProps {
  category: Category;
}

const CategorySection = memo(({ category }: CategorySectionProps) => {
  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 category-header">
          {category.name}
        </div>
        {category.items.map((product) => (
          <MenuItemCard key={product.id} product={product} />
        ))}
      </div>
      {category.description && (
        <p className="text-muted-foreground mt-1">{category.description}</p>
      )}
    </div>
  );
});

CategorySection.displayName = 'CategorySection';

export default CategorySection;
