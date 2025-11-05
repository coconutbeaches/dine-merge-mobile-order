'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductOption } from '@/types/supabaseTypes';
import MenuItemClient from './MenuItemClient';
import Layout from '@/components/layout/Layout';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

type ProductWithOptions = Product & {
  options: ProductOption[];
};

export default function MenuItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [product, setProduct] = useState<ProductWithOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;

      try {
        setIsLoading(true);

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

          setProduct({
            ...productData,
            options: optionsWithChoices
          });
        } else {
          setProduct({
            ...productData,
            options: []
          });
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  if (isLoading) {
    return (
      <Layout title="Loading..." showBackButton>
        <div className="page-container text-center py-10">
          <p>Loading product details...</p>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout title="Error" showBackButton>
        <div className="page-container text-center py-10">
          <AlertTriangle className="h-12 w-12 mx-auto text-black mb-4" />
          <h2 className="text-xl font-bold mb-2">Menu Item Not Found</h2>
          <p className="text-gray-600 mb-6">The item you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/menu')} className="bg-black hover:bg-black/90 text-white">
            Back to Menu
          </Button>
        </div>
      </Layout>
    );
  }

  return <MenuItemClient product={product} />;
}
