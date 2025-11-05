
import { MenuItem } from '@/types';
import { getProductImageUrl } from '@/utils/imageUrl';

export const calculateTotalPrice = (
  item: MenuItem, 
  options: Record<string, string | string[]>
): number => {
  let total = item.price;
  
  // Add option prices
  (item.options || []).forEach(option => {
    const selectedValue = options[option.id];
    
    if (option.multiSelect && Array.isArray(selectedValue)) {
      selectedValue.forEach(value => {
        const choice = option.choices.find(c => c.name === value);
        if (choice) {
          total += choice.price;
        }
      });
    } else if (!Array.isArray(selectedValue)) {
      const choice = option.choices.find(c => c.name === selectedValue);
      if (choice) {
        total += choice.price;
      }
    }
  });
  
  return total;
};

export const convertProductToMenuItem = (product: any): MenuItem => {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    description: product.description || '',
    image: getProductImageUrl(product.image_url) || '/placeholder.svg',
    category: product.category_id || '',
    available: true,
    options: product.options?.map((option: any) => ({
      id: option.id,
      name: option.name,
      required: option.required,
      multiSelect: option.selection_type === 'multiple',
      choices: option.choices.map((choice: any) => ({
        name: choice.name,
        price: choice.price_adjustment
      }))
    })) || []
  };
};
