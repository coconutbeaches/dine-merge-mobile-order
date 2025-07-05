import { useProductFormState } from "./useProductFormState";
import { useProductOptionsState } from "./useProductOptionsState";
import { useProductMutations } from "./useProductMutations";

const useProductForm = () => {
  const {
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
    setIsDragging
  } = useProductFormState();

  const {
    options,
    setOptions,
    handleAddOption,
    handleOptionChange,
    handleDeleteOption
  } = useProductOptionsState(isEditMode, productOptions || [], id);

  const {
    createProductMutation,
    updateProductMutation,
    deleteProductMutation,
    router
  } = useProductMutations({
    id,
    isEditMode,
    options
  });

  // Compose submit handler
  const onSubmit = async (data: any) => {
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
    deleteProductMutation,
    router,
    id,
    categories,
  };
};

export default useProductForm;
