
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { MenuItem } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/supabaseTypes';
import ProductImageHeader from '@/components/menu-item/ProductImageHeader';
import ProductOptions from '@/components/menu-item/ProductOptions';
import QuantityAddToCart from '@/components/menu-item/QuantityAddToCart';
import { calculateTotalPrice, convertProductToMenuItem } from '@/utils/productUtils';
import { formatThaiCurrency } from '@/lib/utils';

const MenuItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useAppContext();
  const { toast } = useToast();
  
  // Fetch the product by ID from Supabase
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) throw new Error('Product ID is required');
      
      try {
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
          
        if (productError) {
          console.error("Error fetching product:", productError);
          throw productError;
        }
        if (!productData) {
          console.error("Product not found");
          throw new Error('Product not found');
        }
        
        // Fetch product options
        const { data: optionsData, error: optionsError } = await supabase
          .from('product_options')
          .select('*')
          .eq('product_id', id)
          .order('sort_order', { ascending: true });
          
        if (optionsError) {
          console.error("Error fetching options:", optionsError);
          throw optionsError;
        }
        
        // Fetch option choices for all options
        if (optionsData && optionsData.length > 0) {
          const optionIds = optionsData.map(option => option.id);
          const { data: choicesData, error: choicesError } = await supabase
            .from('product_option_choices')
            .select('*')
            .in('option_id', optionIds)
            .order('sort_order', { ascending: true });
            
          if (choicesError) {
            console.error("Error fetching choices:", choicesError);
            throw choicesError;
          }
          
          // Attach choices to their corresponding options
          const optionsWithChoices = optionsData.map(option => {
            const choices = choicesData?.filter(choice => choice.option_id === option.id) || [];
            return {
              ...option,
              selection_type: option.selection_type as "single" | "multiple",
              choices
            };
          });
          
          // Return product with options
          return {
            ...productData,
            options: optionsWithChoices
          } as Product & { options: any[] }; // Cast to include options
        }
        
        return { ...productData, options: [] } as Product & { options: any[] }; // Cast to include options
      } catch (err) {
        console.error("Error in product query:", err);
        throw err;
      }
    },
    retry: 1, // Only retry once on failure
  });
  
  const [quantity, setQuantity] = useState(1);
  // State will be keyed by option ID to handle duplicate option names correctly.
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string | string[]>>({});
  
  // Initialize selectedOptions with default values when product loads, using option.id
  React.useEffect(() => {
    if (product?.options) {
      const defaults: Record<string, string | string[]> = {};
      product.options.forEach(option => {
        if (option.required && option.selection_type === 'single') {
          if (option.choices && option.choices.length > 0) {
            defaults[option.id] = option.choices[0].name;
          }
        } else if (option.required && option.selection_type === 'multiple') {
          defaults[option.id] = [];
        }
      });
      setSelectedOptions(defaults);
    }
  }, [product]);

  const menuItemForCart: MenuItem | null = product ? convertProductToMenuItem(product) : null;
  
  const handleOptionChange = (optionId: string, value: string | string[]) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: value
    }));
  };
  
  const handleCheckboxChange = (optionId: string, value: string, checked: boolean) => {
    const currentValues = (selectedOptions[optionId] as string[]) || [];
    
    let newValues: string[];
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }
    
    handleOptionChange(optionId, newValues);
  };
  
  const handleAddToCart = () => {
    if (!menuItemForCart || !product) return;
    
    // Validate required options using option.id
    const missingRequiredOptions = (product?.options || [])
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
    
    // Convert selected options from being keyed by ID to being keyed by name for cart context
    const optionsByName: Record<string, string | string[]> = {};
    if (product.options) {
      product.options.forEach(option => {
        if (selectedOptions[option.id] !== undefined) {
          optionsByName[option.name] = selectedOptions[option.id];
        }
      });
    }
    
    addToCart(menuItemForCart, quantity, optionsByName);
    
    toast({
      title: "Added to cart",
      description: `${quantity} × ${product.name} added to your cart`,
      duration: 1000,
    });
    
    navigate('/');
  };
  
  // For display, convert options to be keyed by name to use the existing price calculation utility
  const optionsForPriceCalc: Record<string, string | string[]> = {};
  if (product?.options) {
    product.options.forEach(option => {
      if (selectedOptions[option.id] !== undefined) {
        optionsForPriceCalc[option.name] = selectedOptions[option.id];
      }
    });
  }
  
  const totalPrice = menuItemForCart ? calculateTotalPrice(menuItemForCart, optionsForPriceCalc) * quantity : 0;

  return (
    <Layout title={product?.name || 'Product Details'} showBackButton>
      <div className="page-container">
        <ProductImageHeader 
          isLoading={isLoading}
          error={error}
          productName={product?.name || ''}
          productDescription={product?.description}
          productPrice={product?.price ? parseFloat(product.price.toString()) : 0}
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
              onQuantityDecrease={() => quantity > 1 && setQuantity(q => q - 1)}
              onQuantityIncrease={() => setQuantity(q => q + 1)}
              onAddToCart={handleAddToCart}
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default MenuItemDetail;
