
import React from "react";
import ProductOptionsManager from "@/components/ProductOptionsManager";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const ProductOptionsSection = ({
  options,
  setOptions,
  handleAddOption,
  handleOptionChange,
  handleDeleteOption,
  isEditMode,
  productId
}) => (
  <div className="mt-6">
    <h3 className="text-lg font-medium mb-4">Options</h3>
    {options.length > 0 ? (
      <div className="space-y-6">
        {options.map((option, index) => (
          <ProductOptionsManager
            key={option.id}
            option={option}
            onChange={updatedOption => handleOptionChange(index, updatedOption)}
            onDelete={() => handleDeleteOption(index)}
          />
        ))}
      </div>
    ) : (
      <div className="text-center py-8 border rounded-lg border-dashed">
        <p className="text-gray-500 mb-4">No options defined yet</p>
      </div>
    )}
    <div className="mt-4">
      <Button
        type="button"
        variant="outline"
        onClick={handleAddOption}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" /> Add option
      </Button>
    </div>
  </div>
);

export default ProductOptionsSection;
