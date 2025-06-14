
import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ProductOption, ProductOptionChoice } from "@/types/supabaseTypes";
import { useProductLoader } from "./useProductLoader";

// For brevity, interface definition
interface Category {
  id: string;
  name: string;
}
interface FormValues {
  name: string;
  price: number | string;
  description: string;
  image: File | null;
  category_id: string | null;
}

const useProductForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Use loader for all data
  const {
    id,
    isEditMode,
    product,
    categories,
    productOptions,
    isLoading,
    error,
  } = useProductLoader();

  // UI state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // react-hook-form for field state
  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      price: "",
      description: "",
      image: null,
      category_id: null,
    },
  });

  // Reset form when data is available for editing
  useEffect(() => {
    if (isEditMode) {
      // Only reset when everything is here
      if (!product || !categories) return;
      console.log("Resetting form with product", product);
      form.reset({
        name: product.name ?? "",
        price:
          product.price !== undefined && product.price !== null
            ? String(product.price)
            : "",
        description: product.description ?? "",
        category_id: product.category_id ?? null,
        image: null,
      });
      if (product.image_url) {
        setImagePreview(product.image_url);
      } else {
        setImagePreview(null);
      }
    }
  }, [product, categories, isEditMode]);

  // Load options when fetched (edit mode)
  useEffect(() => {
    if (isEditMode && productOptions) {
      setOptions(productOptions);
    }
  }, [isEditMode, productOptions]);

  // Image upload handler
  const handleImageChange = (fileOrEvent: File | React.ChangeEvent<HTMLInputElement>) => {
    let file: File | null = null;
    if (fileOrEvent instanceof File) {
      file = fileOrEvent;
    } else {
      file = fileOrEvent.target.files?.[0] || null;
    }
    form.setValue("image", file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Supabase upload util
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
              enable_quantity: option.enable_quantity,
              selection_type: option.selection_type,
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
              enable_quantity: option.enable_quantity,
              selection_type: option.selection_type,
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

  // Public add/delete/handlers for options list
  const handleAddOption = () => {
    const newOption: ProductOption = {
      id: `temp-${nanoid()}`,
      product_id: id || "",
      name: `Option ${options.length + 1}`,
      required: false,
      enable_quantity: false,
      selection_type: "single",
      choices: [{
        id: `temp-${nanoid()}`,
        option_id: '',
        name: 'Choice 1',
        price_adjustment: 0,
        sort_order: 0
      }],
      sort_order: options.length
    };
    setOptions([...options, newOption]);
  };
  const handleOptionChange = (index: number, updatedOption: ProductOption) => {
    const newOptions = [...options];
    newOptions[index] = updatedOption;
    setOptions(newOptions);
  };
  const handleDeleteOption = (index: number) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions.map((option, i) => ({ ...option, sort_order: i })));
  };

  const onSubmit = async (data: FormValues) => {
    if (isEditMode) updateProductMutation.mutate(data);
    else createProductMutation.mutate(data);
  };

  return {
    form,
    onSubmit,
    imagePreview,
    setImagePreview,
    fileInputRef,
    handleImageChange,
    isDragging,
    setIsDragging,
    options,
    setOptions,
    handleAddOption,
    handleOptionChange,
    handleDeleteOption,
    isEditMode,
    isLoading,
    error,
    createProductMutation,
    updateProductMutation,
    navigate,
    id,
    categories,
  };
};

export default useProductForm;

// NOTE: This file is now also getting large; please consider asking for a further split/refactor for long-term maintainability.
