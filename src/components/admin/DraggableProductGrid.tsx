
import React from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Plus } from 'lucide-react';
import { formatThaiCurrency } from '@/lib/utils';
import { NavigateFunction } from 'react-router-dom';
import { Product } from '@/types/supabaseTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
}

interface ProductWithCategory extends Product {
  categories?: Category;
}

interface DraggableProductItemProps {
  product: ProductWithCategory;
  navigate: NavigateFunction;
}

const DraggableProductItem: React.FC<DraggableProductItemProps> = ({ product, navigate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer hover:shadow-lg transition-shadow flex flex-col relative ${
        isDragging ? 'z-50' : ''
      }`}
      onClick={() => navigate(`/products/edit/${product.id}`)}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 p-2 cursor-grab active:cursor-grabbing bg-white/80 rounded hover:bg-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-gray-600" />
      </div>
      
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
          <CardTitle className="text-lg leading-tight" title={product.name}>
            {product.name}
          </CardTitle>
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
              e.stopPropagation();
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

interface DraggableProductGridProps {
  products: ProductWithCategory[];
  isLoading: boolean;
  categoryFilter: string | null;
  categories: Category[];
  handleAddProduct: () => void;
  navigate: NavigateFunction;
  onProductsReorder: (reorderedProducts: ProductWithCategory[]) => void;
}

const DraggableProductGrid: React.FC<DraggableProductGridProps> = ({
  products,
  isLoading,
  categoryFilter,
  categories,
  handleAddProduct,
  navigate,
  onProductsReorder
}) => {
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = products.findIndex((product) => product.id === active.id);
    const newIndex = products.findIndex((product) => product.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedProducts = arrayMove(products, oldIndex, newIndex);
    
    // Update UI immediately
    onProductsReorder(reorderedProducts);

    // Update sort_order in database
    try {
      const updates = reorderedProducts.map((product, index) => ({
        id: product.id,
        sort_order: (index + 1) * 10
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('products')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Product order updated successfully');
    } catch (error) {
      console.error('Error updating product order:', error);
      toast.error('Failed to update product order');
      // Revert the UI changes on error
      onProductsReorder(products);
    }
  };

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
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={products.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <DraggableProductItem
              key={product.id}
              product={product}
              navigate={navigate}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableProductGrid;
