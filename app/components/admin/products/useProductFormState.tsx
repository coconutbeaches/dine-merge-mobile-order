import { useRef, useState } from "react";
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

  // react-hook-form for field state with static defaults
  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      price: "",
      description: "",
      image: null,
      category_id: null,
    },
  });

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
