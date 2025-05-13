
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MenuItem } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/supabaseTypes';
import ProductImageHeader from '@/components/menu-item/ProductImageHeader';
import ProductOptions from '@/components/menu-item/ProductOptions';
import SpecialInstructions from '@/components/menu-item/SpecialInstructions';
import QuantityAddToCart from '@/components/menu-item/QuantityAddToCart';
import { calculateTotalPrice, convertProductToMenuItem } from '@/utils/productUtils';
import { useNavigate } from 'react-router-dom';

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
      
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
        
      if (productError) throw productError;
      if (!productData) throw new Error('Product not found');
      
      // Fetch product options
      const { data: optionsData, error: optionsError } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', id)
        .order('sort_order', { ascending: true });
        
      if (optionsError) throw optionsError;
      
      // Fetch option choices for all options
      if (optionsData && optionsData.length > 0) {
        const optionIds = optionsData.map(option => option.id);
        const { data: choicesData, error: choicesError } = await supabase
          .from('product_option_choices')
          .select('*')
          .in('option_id', optionIds)
          .order('sort_order', { ascending: true });
          
        if (choicesError) throw choicesError;
        
        // Attach choices to their corresponding options
        const optionsWithChoices = optionsData.map(option => {
          const choices = choicesData?.filter(choice => choice.option_id === option.id) || [];
          return {
            ...option,
            choices
          };
        });
        
        // Return product with options
        return {
          ...productData,
          options: optionsWithChoices
        } as Product & { options: any[] };
      }
      
      return { ...productData, options: [] } as Product & { options: any[] };
    },
  });
  
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string | string[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Initialize selectedOptions with default values when product loads
  React.useEffect(() => {
    if (product?.options) {
      const defaults: Record<string, string | string[]> = {};
      product.options.forEach(option => {
        if (option.required && option.selection_type === 'single') {
          // Set first choice as default for required single-select options
          if (option.choices && option.choices.length > 0) {
            defaults[option.name] = option.choices[0].name;
          }
        } else if (option.required && option.selection_type === 'multiple') {
          // Set empty array for required multi-select options
          defaults[option.name] = [];
        }
      });
      setSelectedOptions(defaults);
    }
  }, [product]);

  // Convert product to MenuItem format for cart early to avoid reference errors
  const menuItemForCart: MenuItem | null = product ? convertProductToMenuItem(product) : null;
  
  const handleOptionChange = (optionName: string, value: string | string[]) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };
  
  const handleCheckboxChange = (optionName: string, value: string, checked: boolean) => {
    const currentValues = selectedOptions[optionName] as string[] || [];
    
    let newValues: string[];
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }
    
    handleOptionChange(optionName, newValues);
  };
  
  const handleAddToCart = () => {
    if (!menuItemForCart) return;
    
    // Validate required options
    const missingRequiredOptions = (product?.options || [])
      .filter(option => option.required)
      .filter(option => {
        const selected = selectedOptions[option.name];
        if (option.selection_type === 'multiple') {
          return !selected || (selected as string[]).length === 0;
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
    
    // Calculate total price including options
    let totalItemPrice = calculateTotalPrice(menuItemForCart, selectedOptions);
    
    addToCart(menuItemForCart, quantity, selectedOptions, specialInstructions);
    
    toast({
      title: "Added to cart",
      description: `${quantity} × ${product.name} added to your cart`,
    });
    
    navigate('/menu');
  };
  
  // Calculate total price for display
  const totalPrice = menuItemForCart && calculateTotalPrice(menuItemForCart, selectedOptions) * quantity;

  return (
    <Layout title={product?.name || 'Product Details'} showBackButton>
      <div className="page-container">
        <ProductImageHeader 
          isLoading={isLoading}
          error={error}
          productName={product?.name || ''}
          productDescription={product?.description}
          productPrice={product?.price || 0}
          imageUrl={product?.image_url}
        />
        
        {/* Only render these components if we have a product */}
        {product && (
          <>
            <ProductOptions 
              options={product.options || []}
              selectedOptions={selectedOptions}
              onOptionChange={handleOptionChange}
              onCheckboxChange={handleCheckboxChange}
            />
            
            <SpecialInstructions 
              value={specialInstructions}
              onChange={setSpecialInstructions}
            />
            
            <QuantityAddToCart 
              quantity={quantity}
              totalPrice={totalPrice || 0}
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
