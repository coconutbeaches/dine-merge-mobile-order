
import { useState, useEffect } from 'react';
import { ProductOption } from '@/types/supabaseTypes';

export const useMenuItemForm = (productOptions: ProductOption[] | undefined) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string | string[]>>({});

  useEffect(() => {
    if (productOptions) {
      const defaults: Record<string, string | string[]> = {};
      productOptions.forEach(option => {
        if (option.required) {
          if (option.selection_type === 'single' && option.choices && option.choices.length > 0) {
            defaults[option.id] = option.choices[0].name;
          } else if (option.selection_type === 'multiple') {
            defaults[option.id] = [];
          }
        }
      });
      setSelectedOptions(defaults);
    }
  }, [productOptions]);

  const handleOptionChange = (optionId: string, value: string | string[]) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: value
    }));
  };

  const handleCheckboxChange = (optionId: string, value: string, checked: boolean) => {
    const currentValues = (selectedOptions[optionId] as string[]) || [];
    let newValues: string[];
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }
    handleOptionChange(optionId, newValues);
  };
  
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };
  const increaseQuantity = () => setQuantity(q => q + 1);

  return {
    quantity,
    selectedOptions,
    handleOptionChange,
    handleCheckboxChange,
    decreaseQuantity,
    increaseQuantity,
  };
};
