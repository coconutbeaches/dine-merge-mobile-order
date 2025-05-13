
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductOption } from '@/types/supabaseTypes';

interface ProductOptionsProps {
  options: ProductOption[];
  selectedOptions: Record<string, string | string[]>;
  onOptionChange: (optionName: string, value: string | string[]) => void;
  onCheckboxChange: (optionName: string, value: string, checked: boolean) => void;
}

const ProductOptions: React.FC<ProductOptionsProps> = ({
  options,
  selectedOptions,
  onOptionChange,
  onCheckboxChange
}) => {
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-4">
      {options.map((option) => (
        <Card key={option.name} className="border border-gray-200">
          <CardContent className="p-4">
            <Label className="text-base font-medium mb-2 block">
              {option.name}
              {option.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            
            {option.selection_type === 'multiple' ? (
              // Multi-select options (checkboxes)
              <div className="space-y-2">
                {option.choices.map((choice) => (
                  <div key={choice.name} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`${option.name}-${choice.name}`}
                      checked={(selectedOptions[option.name] as string[] || []).includes(choice.name)}
                      onCheckedChange={(checked) => {
                        onCheckboxChange(option.name, choice.name, checked as boolean);
                      }}
                      className="border-black data-[state=checked]:bg-black data-[state=checked]:text-white"
                    />
                    <label 
                      htmlFor={`${option.name}-${choice.name}`}
                      className="text-sm cursor-pointer flex justify-between w-full"
                    >
                      <span>{choice.name}</span>
                      {choice.price_adjustment > 0 && <span>+${choice.price_adjustment.toFixed(2)}</span>}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              // Single-select options (radio buttons)
              <RadioGroup 
                value={selectedOptions[option.name] as string || ''}
                onValueChange={(value) => onOptionChange(option.name, value)}
                className="space-y-2"
              >
                {option.choices.map((choice) => (
                  <div key={choice.name} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={choice.name} 
                      id={`${option.name}-${choice.name}`} 
                      className="border-black text-black"
                    />
                    <label 
                      htmlFor={`${option.name}-${choice.name}`}
                      className="text-sm cursor-pointer flex justify-between w-full"
                    >
                      <span>{choice.name}</span>
                      {choice.price_adjustment > 0 && <span>+${choice.price_adjustment.toFixed(2)}</span>}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProductOptions;
