import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductOption, ProductOptionChoice } from '@/types/supabaseTypes';
import { Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { nanoid } from 'nanoid';

interface ProductOptionsManagerProps {
  option: ProductOption;
  onChange: (updatedOption: ProductOption) => void;
  onDelete: () => void;
}

const ProductOptionsManager: React.FC<ProductOptionsManagerProps> = ({ 
  option, 
  onChange,
  onDelete 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const updateOption = (updates: Partial<ProductOption>) => {
    onChange({ ...option, ...updates });
  };

  const handleChoiceChange = (index: number, updates: Partial<ProductOptionChoice>) => {
    const updatedChoices = [...option.choices];
    updatedChoices[index] = { ...updatedChoices[index], ...updates };
    updateOption({ choices: updatedChoices });
  };

  const addChoice = () => {
    const newChoice: ProductOptionChoice = {
      id: `temp-${nanoid()}`,
      option_id: option.id,
      name: `Choice ${option.choices.length + 1}`,
      price_adjustment: 0,
      sort_order: option.choices.length
    };
    
    updateOption({ choices: [...option.choices, newChoice] });
  };

  const removeChoice = (index: number) => {
    const updatedChoices = [...option.choices];
    updatedChoices.splice(index, 1);
    updateOption({ 
      choices: updatedChoices.map((choice, i) => ({ ...choice, sort_order: i }))
    });
  };

  return (
    
    <div className="border rounded-md overflow-hidden">
      <div 
        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Input 
            value={option.name} 
            onChange={(e) => updateOption({ name: e.target.value })}
            className="max-w-[200px] bg-white"
            onClick={(e) => e.stopPropagation()}
          />
          {option.required && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>}
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 border-t">
          <div className="flex items-center space-x-6 mb-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`required-${option.id}`}
                checked={option.required}
                onCheckedChange={(checked) => updateOption({ required: !!checked })}
              />
              <label htmlFor={`required-${option.id}`} className="text-sm">Required</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`enable-quantity-${option.id}`}
                checked={option.enable_quantity}
                onCheckedChange={(checked) => updateOption({ enable_quantity: !!checked })}
              />
              <label htmlFor={`enable-quantity-${option.id}`} className="text-sm">Enable quantity</label>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="text-sm font-medium block mb-1">Selection</label>
            <Select 
              value={option.selection_type} 
              onValueChange={(value: "single" | "multiple") => updateOption({ selection_type: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single selection</SelectItem>
                <SelectItem value="multiple">Multiple selection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            {option.choices.map((choice, index) => (
              <div key={choice.id} className="flex items-center space-x-2">
                <div className="flex-grow">
                  <Input
                    value={choice.name}
                    onChange={(e) => handleChoiceChange(index, { name: e.target.value })}
                    placeholder={`Choice ${index + 1}`}
                  />
                </div>
                <div className="w-24">
                  <div className="relative">
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3 text-gray-500">฿</span>
                    <Input
                      type="text"
                      value={choice.price_adjustment}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        const decimalCount = (value.match(/\./g) || []).length;
                        if (decimalCount <= 1) {
                          handleChoiceChange(index, { price_adjustment: parseFloat(value) || 0 });
                        }
                      }}
                      placeholder="0"
                      className="pl-7"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeChoice(index)}
                  disabled={option.choices.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addChoice}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" /> Add choice
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductOptionsManager;
