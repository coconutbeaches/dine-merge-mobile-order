'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { MenuItem } from '@/types';
import { useMenuItemForm } from '@/hooks/useMenuItemForm';
import ProductImageHeader from '@/components/menu-item/ProductImageHeader';
import ProductOptions from '@/components/menu-item/ProductOptions';
import QuantityAddToCart from '@/components/menu-item/QuantityAddToCart';
import { calculateTotalPrice, convertProductToMenuItem } from '@/utils/productUtils';
import { Product, ProductOption } from '@/types/supabaseTypes';
import Layout from '@/components/layout/Layout';

type ProductWithOptions = Product & {
  options: ProductOption[];
};

interface MenuItemClientProps {
  product: ProductWithOptions;
}

export default function MenuItemClient({ product }: MenuItemClientProps) {
  const router = useRouter();
  const { addToCart } = useAppContext();
  const { toast } = useToast();

  const {
    quantity,
    selectedOptions,
    handleOptionChange,
    handleCheckboxChange,
    decreaseQuantity,
    increaseQuantity,
  } = useMenuItemForm(product.options);

  const menuItemForCart: MenuItem | null = product ? convertProductToMenuItem(product) : null;

  const handleAddToCart = () => {
    if (!menuItemForCart || !product) return;

    const missingRequiredOptions = (product.options || [])
      .filter(option => option.required)
      .filter(option => {
        const selected = selectedOptions[option.id];
        if (option.selection_type === 'multiple') {
          return !selected || (Array.isArray(selected) && selected.length === 0);
        }
        return !selected;
      });

    if (missingRequiredOptions.length > 0) {
      toast({
        title: "Missing options",
        description: `Please select ${missingRequiredOptions.map(o => o.name).join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    addToCart(menuItemForCart, quantity, selectedOptions);

    toast({
      title: "Added to cart",
      description: `${quantity} × ${product.name} added to your cart`,
      duration: 1000,
    });

    router.push('/menu');
  };

  const totalPrice = menuItemForCart ? calculateTotalPrice(menuItemForCart, selectedOptions) * quantity : 0;

  return (
    <Layout title={product.name} showBackButton>
      <div className="page-container">
        <ProductImageHeader 
          isLoading={false}
          error={null}
          productDescription={product.description}
          imageUrl={product.image_url}
        />
        
        <ProductOptions 
          options={product.options || []}
          selectedOptions={selectedOptions}
          onOptionChange={handleOptionChange}
          onCheckboxChange={handleCheckboxChange}
        />
        
        <QuantityAddToCart 
          quantity={quantity}
          totalPrice={totalPrice}
          onQuantityDecrease={decreaseQuantity}
          onQuantityIncrease={increaseQuantity}
          onAddToCart={handleAddToCart}
        />
      </div>
    </Layout>
  );
}
