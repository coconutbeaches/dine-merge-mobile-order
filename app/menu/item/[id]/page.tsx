import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductOption } from '@/types/supabaseTypes';
import MenuItemClient from './MenuItemClient';

type ProductWithOptions = Product & {
  options: ProductOption[];
};

interface MenuItemPageProps {
  params: Promise<{ id: string }>;
}

export default async function MenuItemPage({ params }: MenuItemPageProps) {
  const { id } = await params;

  try {
    // Fetch product data
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (productError) {
      throw new Error(productError.message || 'Product not found');
    }

    if (!productData) {
      throw new Error('Product not found');
    }

    // Fetch product options
    const { data: optionsData, error: optionsError } = await supabase
      .from('product_options')
      .select('*')
      .eq('product_id', id)
      .order('sort_order', { ascending: true });

    if (optionsError) {
      throw new Error(optionsError.message);
    }

    const options = optionsData || [];

    // Fetch option choices if there are options
    if (options.length > 0) {
      const optionIds = options.map(option => option.id);
      const { data: choicesData, error: choicesError } = await supabase
        .from('product_option_choices')
        .select('*')
        .in('option_id', optionIds)
        .order('sort_order', { ascending: true });

      if (choicesError) {
        throw new Error(choicesError.message);
      }

      // Attach choices to options
      const optionsWithChoices = options.map(option => {
        const choices = choicesData?.filter(choice => choice.option_id === option.id) || [];
        return {
          ...option,
          selection_type: option.selection_type as "single" | "multiple",
          choices
        };
      });

      const productWithOptions: ProductWithOptions = {
        ...productData,
        options: optionsWithChoices
      };

      return <MenuItemClient product={productWithOptions} />;
    }

    // No options case
    const productWithOptions: ProductWithOptions = {
      ...productData,
      options: []
    };

    return <MenuItemClient product={productWithOptions} />;

  } catch (error) {
    console.error('Error fetching product:', error);
    throw error; // This will be caught by the error boundary
  }
}
