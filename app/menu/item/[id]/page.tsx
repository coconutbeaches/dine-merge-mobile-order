import React from 'react';
import { Product, ProductOption } from '@/types/supabaseTypes';
import { getProductImageUrl } from '@/utils/imageUrl';
import MenuItemClient from './MenuItemClient';
import { createServerClient } from '@/lib/supabase-server';
import { hasSupabaseClient } from '@/integrations/supabase/client';

export const dynamic = 'force-dynamic';

type ProductWithOptions = Product & {
  options: ProductOption[];
};

interface MenuItemPageProps {
  params: Promise<{ id: string }>;
}

export default async function MenuItemPage({ params }: MenuItemPageProps) {
  const { id } = await params;

  try {
    if (!hasSupabaseClient()) {
      console.warn('[MenuItemPage] Supabase environment variables missing during build; returning fallback product.');
      const fallbackProduct: ProductWithOptions = {
        id,
        name: 'Menu item unavailable',
        description: 'Product details are temporarily unavailable.',
        image_url: null,
        price: 0,
        category_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sort_order: 0,
        options: [],
      };

      return <MenuItemClient product={fallbackProduct} />;
    }

    const supabase = await createServerClient();
    if (!supabase) {
      console.warn('[MenuItemPage] Supabase client unavailable; returning fallback product.');
      const fallbackProduct: ProductWithOptions = {
        id,
        name: 'Menu item unavailable',
        description: 'Product details are temporarily unavailable.',
        image_url: null,
        price: 0,
        category_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sort_order: 0,
        options: [],
      };

      return <MenuItemClient product={fallbackProduct} />;
    }

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
    const product = {
      ...productData,
      image_url: getProductImageUrl(productData.image_url),
    };

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
        ...product,
        options: optionsWithChoices
      };

      return <MenuItemClient product={productWithOptions} />;
    }

    // No options case
    const productWithOptions: ProductWithOptions = {
      ...product,
      options: []
    };

    return <MenuItemClient product={productWithOptions} />;

  } catch (error) {
    console.error('Error fetching product:', error);
    throw error; // This will be caught by the error boundary
  }
}
