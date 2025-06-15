import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { MenuItem } from '@/types';
import { useProductDetail } from '@/hooks/useProductDetail';
import { useMenuItemForm } from '@/hooks/useMenuItemForm';
import ProductImageHeader from '@/components/menu-item/ProductImageHeader';
import ProductOptions from '@/components/menu-item/ProductOptions';
import QuantityAddToCart from '@/components/menu-item/QuantityAddToCart';
import { calculateTotalPrice, convertProductToMenuItem } from '@/utils/productUtils';

const MenuItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useAppContext();
  const { toast } = useToast();

  const { data: product, isLoading, error } = useProductDetail(id);
  
  const {
    quantity,
    selectedOptions,
    handleOptionChange,
    handleCheckboxChange,
    decreaseQuantity,
    increaseQuantity,
  } = useMenuItemForm(product?.options);

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
    
    navigate('/');
  };
  
  const totalPrice = menuItemForCart ? calculateTotalPrice(menuItemForCart, selectedOptions) * quantity : 0;

  return (
    <Layout title={product?.name || 'Product Details'} showBackButton>
      <div className="page-container">
        <ProductImageHeader 
          isLoading={isLoading}
          error={error}
          productDescription={product?.description}
          imageUrl={product?.image_url}
        />
        
        {product && (
          <>
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
          </>
        )}
      </div>
    </Layout>
  );
};

export default MenuItemDetail;
