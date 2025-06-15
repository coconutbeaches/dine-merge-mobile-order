
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductOption } from '@/types/supabaseTypes';

interface ProductOptionsProps {
  options: ProductOption[];
  selectedOptions: Record<string, string | string[]>;
  onOptionChange: (optionId: string, value: string | string[]) => void;
  onCheckboxChange: (optionId: string, value: string, checked: boolean) => void;
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
    <div className="mb-12 space-y-4">
      {options.map((option) => (
        <Card key={option.id} className="border border-gray-200">
          <CardContent className="p-4">
            <Label className="text-base font-medium mb-2 block">
              {option.name}
              {option.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            
            {option.selection_type === 'multiple' ? (
              // Multi-select options (checkboxes)
              <div className="space-y-2">
                {option.choices.map((choice) => {
                  const currentSelection = selectedOptions[option.id];
                  const isChecked = Array.isArray(currentSelection) && currentSelection.includes(choice.name);

                  return (
                    <div key={choice.name} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`${option.id}-${choice.name}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          onCheckboxChange(option.id, choice.name, checked as boolean);
                        }}
                        className="border-black data-[state=checked]:bg-black data-[state=checked]:text-white"
                      />
                      <label 
                        htmlFor={`${option.id}-${choice.name}`}
                        className="text-sm cursor-pointer flex justify-between w-full"
                      >
                        <span>{choice.name}</span>
                        {choice.price_adjustment > 0 && <span>+${choice.price_adjustment.toFixed(2)}</span>}
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Single-select options (radio buttons)
              <RadioGroup 
                value={selectedOptions[option.id] as string || ''}
                onValueChange={(value) => onOptionChange(option.id, value)}
                className="space-y-2"
              >
                {option.choices.map((choice) => (
                  <div key={choice.name} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={choice.name} 
                      id={`${option.id}-${choice.name}`} 
                      className="border-black text-black"
                    />
                    <label 
                      htmlFor={`${option.id}-${choice.name}`}
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
