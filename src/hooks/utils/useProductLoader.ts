
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product, ProductOption, ProductOptionChoice } from "@/types/supabaseTypes";

// For brevity, interface definition
interface Category {
  id: string;
  name: string;
}

export function useProductLoader() {
  const params = useParams();
  // Support both 'id' and 'productId' param keys
  const idParam = params.id as string || params.productId as string || undefined;
  const id = idParam;
  const isEditMode = Boolean(id) && id !== "new";

  // Debug log params and id
  console.log("[useProductLoader] useParams:", params, "resolved id:", id, "isEditMode:", isEditMode);

  // Fetch categories
  const {
    data: categories,
    isLoading: isCategoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  // Fetch product (edit mode only)
  const {
    data: product,
    isLoading: isProductLoading,
    error: productError,
  } = useQuery({
    queryKey: ["product", id],
    // Add debug about id
    queryFn: async () => {
      console.log("[useProductLoader][PRODUCT] id in queryFn:", id, "isEditMode:", isEditMode);
      if (!isEditMode) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      console.log("[useProductLoader][PRODUCT] fetched:", data, "error:", error);
      if (error) throw error;
      return data as Product | null;
    },
    enabled: isEditMode,
  });

  // Fetch product options (edit mode only)
  const {
    data: productOptions,
    isLoading: isOptionsLoading,
    error: optionsError,
  } = useQuery({
    queryKey: ["productOptions", id],
    queryFn: async () => {
      console.log("[useProductLoader][OPTIONS] id in queryFn:", id, "isEditMode:", isEditMode);
      if (!isEditMode) return [];
      const { data: optionsData, error: optionsError } = await supabase
        .from("product_options")
        .select("*")
        .eq("product_id", id)
        .order("sort_order", { ascending: true });
      if (optionsError) throw optionsError;

      const options: ProductOption[] = [];
      for (const option of optionsData) {
        const { data: choicesData, error: choicesError } = await supabase
          .from("product_option_choices")
          .select("*")
          .eq("option_id", option.id)
          .order("sort_order", { ascending: true });
        if (choicesError) throw choicesError;

        options.push({
          ...option,
          selection_type: option.selection_type as "single" | "multiple",
          choices: choicesData as ProductOptionChoice[],
        });
      }
      console.log("[useProductLoader][OPTIONS] fetched:", options);
      return options;
    },
    enabled: isEditMode,
  });

  // Loading/error
  const isLoading =
    isEditMode
      ? isProductLoading || isCategoriesLoading || isOptionsLoading
      : isCategoriesLoading;
  let error = null;
  if (categoriesError) error = categoriesError;
  if (productError) error = productError;
  if (optionsError) error = optionsError;
  if (isEditMode && !isProductLoading && !product) {
    error = `Product not found (ID: ${id})`;
  }

  return {
    id,
    isEditMode,
    product,
    categories,
    productOptions,
    isLoading,
    error,
  };
}
