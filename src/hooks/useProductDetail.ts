
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductOption } from '@/types/supabaseTypes';

export type ProductWithWithOptions = Product & { options: ProductOption[] };

export const useProductDetail = (id: string | undefined) => {
  return useQuery<ProductWithWithOptions | null>({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) throw new Error('Product ID is required');
      
      try {
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybeSingle();
          
        if (productError) {
          console.error("Error fetching product:", productError);
          throw productError;
        }
        if (!productData) {
          console.error("Product not found");
          throw new Error('Product not found');
        }
        
        const { data: optionsData, error: optionsError } = await supabase
          .from('product_options')
          .select('*')
          .eq('product_id', id)
          .order('sort_order', { ascending: true });
          
        if (optionsError) {
          console.error("Error fetching options:", optionsError);
          throw optionsError;
        }
        
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
          
          const optionsWithChoices = optionsData.map(option => {
            const choices = choicesData?.filter(choice => choice.option_id === option.id) || [];
            return {
              ...option,
              selection_type: option.selection_type as "single" | "multiple",
              choices
            };
          });
          
          return {
            ...productData,
            options: optionsWithChoices
          };
        }
        
        return { ...productData, options: [] };
      } catch (err) {
        console.error("Error in product query:", err);
        throw err;
      }
    },
    enabled: !!id,
    retry: 1,
  });
};
