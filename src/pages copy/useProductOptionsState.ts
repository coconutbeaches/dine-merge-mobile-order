
import { useState, useEffect } from "react";
import type { ProductOption } from "@/types/supabaseTypes";
import { nanoid } from "nanoid";

export function useProductOptionsState(isEditMode: boolean, productOptions: ProductOption[], productId?: string) {
  const [options, setOptions] = useState<ProductOption[]>([]);

  // Load options when fetched (edit mode)
  useEffect(() => {
    if (isEditMode && productOptions) {
      setOptions(productOptions);
    } else if (!isEditMode) {
      setOptions([]);
    }
  }, [isEditMode, productOptions]);

  // Public add/delete/handlers for options list
  const handleAddOption = () => {
    const newOption: ProductOption = {
      id: `temp-${nanoid()}`,
      product_id: productId || "",
      name: `Option ${options.length + 1}`,
      required: false,
      selection_type: "single",
      max_selections: null,
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

  return {
    options,
    setOptions,
    handleAddOption,
    handleOptionChange,
    handleDeleteOption,
  };
}
