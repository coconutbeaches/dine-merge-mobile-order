
import React from "react";
import useProductForm from "./useProductForm";
import ProductFormFields from "./ProductFormFields";
import ProductImageUpload from "./ProductImageUpload";
import ProductOptionsSection from "./ProductOptionsSection";
import Layout from "@/components/layout/Layout";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

const ProductFormMain = () => {
  const formLogic = useProductForm();

  // These are in a custom hook, destructured out for clarity:
  const {
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
    categories // <-- Add categories here
  } = formLogic;

  // Loading / error / not found states
  if (isLoading) {
    return (
      <Layout title={isEditMode ? "Edit Product" : "Add Product"}>
        <div className="container mx-auto py-6">Loading...</div>
      </Layout>
    );
  }
  if (error) {
    return (
      <Layout title="Product Not Found">
        <div className="container mx-auto py-6 text-red-500">
          {typeof error === "string" ? error : "Failed to load product"}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={isEditMode ? "Edit Product" : "Add Product"} showBackButton>
      <div className="container mx-auto py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ProductFormFields form={form} categories={categories} />
            <ProductImageUpload
              form={form}
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              fileInputRef={fileInputRef}
              handleImageChange={handleImageChange}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
            />
            <ProductOptionsSection
              options={options}
              setOptions={setOptions}
              handleAddOption={handleAddOption}
              handleOptionChange={handleOptionChange}
              handleDeleteOption={handleDeleteOption}
              isEditMode={isEditMode}
              productId={id}
            />

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/products-dashboard')}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createProductMutation.isPending || updateProductMutation.isPending}
              >
                {createProductMutation.isPending || updateProductMutation.isPending ? 
                  'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
};

export default ProductFormMain;
