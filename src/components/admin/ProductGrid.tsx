
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, GripVertical } from 'lucide-react';
import { formatThaiCurrency } from '@/lib/utils';
import { NavigateFunction } from 'react-router-dom';
import { Product } from '@/types/supabaseTypes';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Category {
  id: string;
  name: string;
}

// Ensure ProductWithCategory is defined or imported if it's used across files
// For this example, keeping it as is if it's only locally used or already defined elsewhere.
interface ProductWithCategory extends Product {
  categories?: Category;
}

interface ProductGridProps {
  products: ProductWithCategory[];
  isLoading: boolean;
  categoryFilter: string | null;
  categories: Category[];
  handleAddProduct: () => void;
  navigate: NavigateFunction;
  handleDragEnd: (event: DragEndEvent) => void; // active and over are part of DragEndEvent
}

interface SortableProductCardProps {
  product: ProductWithCategory;
  navigate: NavigateFunction;
}

const SortableProductCard: React.FC<SortableProductCardProps> = ({ product, navigate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="hover:shadow-lg transition-shadow flex flex-col"
      // onClick={() => navigate(`/products/edit/${product.id}`)} // Navigation handled by button or other specific elements
    >
      <div className="relative aspect-square bg-gray-100 w-full">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
            onClick={() => navigate(`/products/edit/${product.id}`)} // Allow click on image for navigation
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400" onClick={() => navigate(`/products/edit/${product.id}`)}>
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
        <CardHeader className="p-0 pb-2 flex justify-between items-start">
          <CardTitle
            className="text-lg leading-tight cursor-pointer hover:underline"
            title={product.name}
            onClick={() => navigate(`/products/edit/${product.id}`)} // Allow click on title for navigation
          >
            {product.name}
          </CardTitle>
          <button {...attributes} {...listeners} className="p-1 text-gray-500 hover:text-gray-700 cursor-grab touch-none">
            <GripVertical size={20} />
          </button>
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
              // e.stopPropagation(); // No longer strictly needed if card onClick is removed
              navigate(`/products/edit/${product.id}`);
            }}
          >
            Edit
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
};

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading,
  categoryFilter,
  categories,
  handleAddProduct,
  navigate,
  handleDragEnd
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={products.map(p => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <SortableProductCard key={product.id} product={product} navigate={navigate} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default ProductGrid;
