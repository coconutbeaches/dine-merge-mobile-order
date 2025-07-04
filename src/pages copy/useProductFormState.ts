
import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { ProductOption } from "@/types/supabaseTypes";
import { useProductLoader } from "./useProductLoader";

// For brevity, interface definition
interface FormValues {
  name: string;
  price: number | string;
  description: string;
  image: File | null;
  category_id: string | null;
}

export function useProductFormState() {
  const {
    id,
    isEditMode,
    product,
    categories,
    productOptions,
    isLoading,
    error
  } = useProductLoader();

  // UI state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  // Debug: log data loading state
  useEffect(() => {
    console.log("[useProductFormState] id:", id, "isEditMode:", isEditMode, "isLoading:", isLoading, "product:", product, "categories:", categories, "error:", error);
  }, [id, isEditMode, isLoading, product, categories, error]);

  // Reset form only when all data is ready for edit mode
  useEffect(() => {
    if (
      isEditMode &&
      !isLoading &&
      product &&
      categories &&
      !error
    ) {
      const resetValues = {
        name: product.name ?? "",
        price:
          product.price !== undefined && product.price !== null
            ? String(product.price)
            : "",
        description: product.description ?? "",
        category_id: product.category_id ?? null,
        image: null,
      };
      console.log("[useProductFormState] Running form.reset with:", resetValues);
      form.reset(resetValues);
      if (product.image_url) {
        setImagePreview(product.image_url);
      } else {
        setImagePreview(null);
      }
    }
    // For new product (not edit), ensure form is cleared if going from edit -> new
    if (!isEditMode && !isLoading && !error) {
      console.log("[useProductFormState] New mode: resetting form to empty values");
      form.reset({
        name: "",
        price: "",
        description: "",
        image: null,
        category_id: null,
      });
      setImagePreview(null);
    }
  }, [isEditMode, isLoading, product, categories, error]);

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

  return {
    id,
    isEditMode,
    product,
    categories,
    productOptions,
    isLoading,
    error,
    form,
    imagePreview,
    setImagePreview,
    fileInputRef,
    handleImageChange,
    isDragging,
    setIsDragging,
  };
}
