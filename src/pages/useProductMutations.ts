
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { ProductOption } from "@/types/supabaseTypes";

interface FormValues {
  name: string;
  price: number | string;
  description: string;
  image: File | null;
  category_id: string | null;
}

interface MutationProps {
  id?: string;
  isEditMode: boolean;
  options: ProductOption[];
}

export function useProductMutations({ id, isEditMode, options }: MutationProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Util: upload image to Supabase
  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${nanoid()}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error: uploadError } = await supabase
      .storage
      .from('products')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase
      .storage
      .from('products')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      let imageUrl = null;
      if (data.image) imageUrl = await uploadImage(data.image);

      const { data: newProduct, error } = await supabase
        .from('products').insert([{
          name: data.name,
          description: data.description,
          price: parseFloat(data.price.toString()),
          image_url: imageUrl,
          category_id: data.category_id,
        }]).select().single();

      if (error) throw error;

      // Insert options
      if (options.length > 0) {
        for (const option of options) {
          const { data: newOption, error: optionError } = await supabase
            .from("product_options")
            .insert([{
              product_id: newProduct.id,
              name: option.name,
              required: option.required,
              selection_type: option.selection_type,
              max_selections: option.max_selections,
              sort_order: option.sort_order
            }])
            .select()
            .single();
          if (optionError) throw optionError;
          if (option.choices && option.choices.length > 0) {
            const choicesData = option.choices.map((choice, index) => ({
              option_id: newOption.id,
              name: choice.name,
              price_adjustment: choice.price_adjustment,
              sort_order: index
            }));
            const { error: choicesError } = await supabase
              .from("product_option_choices")
              .insert(choicesData);
            if (choicesError) throw choicesError;
          }
        }
      }
      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["menu-products"] });
      toast.success("Product created successfully");
      navigate("/products-dashboard");
    },
    onError: (error) => {
      toast.error("Failed to create product");
      console.error(error);
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!id) return;
      let imageUrl = null;
      if (data.image) {
        imageUrl = await uploadImage(data.image);
      }
      const updateData: any = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price.toString()),
        category_id: data.category_id
      };
      if (imageUrl) {
        updateData.image_url = imageUrl;
      }
      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;

      // Remove old options and add new
      const { error: deleteOptionsError } = await supabase
        .from("product_options")
        .delete()
        .eq("product_id", id);
      if (deleteOptionsError) throw deleteOptionsError;

      // Insert options
      if (options.length > 0) {
        for (const option of options) {
          const { data: newOption, error: optionError } = await supabase
            .from("product_options")
            .insert([{
              product_id: id,
              name: option.name,
              required: option.required,
              selection_type: option.selection_type,
              max_selections: option.max_selections,
              sort_order: option.sort_order
            }])
            .select()
            .single();
          if (optionError) throw optionError;
          if (option.choices && option.choices.length > 0) {
            const choicesData = option.choices.map((choice, index) => ({
              option_id: newOption.id,
              name: choice.name,
              price_adjustment: choice.price_adjustment,
              sort_order: index
            }));
            const { error: choicesError } = await supabase
              .from("product_option_choices")
              .insert(choicesData);
            if (choicesError) throw choicesError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["menu-products"] });
      toast.success("Product updated successfully");
      navigate("/products-dashboard");
    },
    onError: (error) => {
      toast.error("Failed to update product");
      console.error(error);
    }
  });

  return {
    createProductMutation,
    updateProductMutation,
    navigate,
  };
}
