import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import useProductForm from "./useProductForm";
import { ProductFormFields } from "./ProductFormFields";
import { ProductImageUpload } from "./ProductImageUpload";
import { ProductOptionsSection } from "./ProductOptionsSection";

export function ProductFormMain() {
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
    handleAddOption,
    handleOptionChange,
    handleDeleteOption,
    isEditMode,
    isLoading,
    error,
    createProductMutation,
    updateProductMutation,
    categories,
  } = useProductForm();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error.toString()}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubmitting = createProductMutation.isPending || updateProductMutation.isPending;

  return (
    <div className="container mx-auto py-6 px-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>
            {isEditMode ? "Edit Product" : "Create New Product"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <ProductFormFields
                    form={form}
                    categories={categories || []}
                  />
                </div>
                
                <div className="space-y-6">
                  <ProductImageUpload
                    imagePreview={imagePreview}
                    setImagePreview={setImagePreview}
                    fileInputRef={fileInputRef}
                    handleImageChange={handleImageChange}
                    isDragging={isDragging}
                    setIsDragging={setIsDragging}
                  />
                </div>
              </div>

              <ProductOptionsSection
                options={options}
                onAddOption={handleAddOption}
                onOptionChange={handleOptionChange}
                onDeleteOption={handleDeleteOption}
              />

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditMode ? "Update Product" : "Create Product"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProductFormMain;
