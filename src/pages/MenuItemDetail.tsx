
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { menuItems } from '@/data/mockData';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Toast } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Plus, Minus } from 'lucide-react';
import { MenuItem, MenuItemOption } from '@/types';

const MenuItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useAppContext();
  const { toast } = useToast();
  
  // Find the menu item by ID
  const menuItem = menuItems.find(item => item.id === id);
  
  // Handle invalid item ID
  if (!menuItem) {
    return (
      <Layout title="Item Not Found" showBackButton>
        <div className="page-container text-center py-10">
          <AlertTriangle className="h-12 w-12 mx-auto text-restaurant-primary mb-4" />
          <h2 className="text-xl font-bold mb-2">Menu Item Not Found</h2>
          <p className="text-muted-foreground mb-6">The item you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/menu')}>Back to Menu</Button>
        </div>
      </Layout>
    );
  }
  
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string | string[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Initialize selectedOptions with default values
  React.useEffect(() => {
    const defaults: Record<string, string | string[]> = {};
    menuItem.options?.forEach(option => {
      if (option.required && !option.multiSelect) {
        // Set first choice as default for required single-select options
        defaults[option.name] = option.choices[0].name;
      } else if (option.required && option.multiSelect) {
        // Set empty array for required multi-select options
        defaults[option.name] = [];
      }
    });
    setSelectedOptions(defaults);
  }, [menuItem]);
  
  const handleOptionChange = (optionName: string, value: string | string[]) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };
  
  const handleCheckboxChange = (optionName: string, value: string, checked: boolean) => {
    const currentValues = selectedOptions[optionName] as string[] || [];
    
    let newValues: string[];
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }
    
    handleOptionChange(optionName, newValues);
  };
  
  const handleAddToCart = () => {
    // Validate required options
    const missingRequiredOptions = (menuItem.options || [])
      .filter(option => option.required)
      .filter(option => {
        const selected = selectedOptions[option.name];
        if (option.multiSelect) {
          return !selected || (selected as string[]).length === 0;
        }
        return !selected;
      });
    
    if (missingRequiredOptions.length > 0) {
      toast({
        title: "Missing options",
        description: `Please select ${missingRequiredOptions.map(o => o.name).join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    // Calculate total price including options
    let totalItemPrice = calculateTotalPrice(menuItem, selectedOptions);
    
    addToCart(menuItem, quantity, selectedOptions, specialInstructions);
    
    toast({
      title: "Added to cart",
      description: `${quantity} × ${menuItem.name} added to your cart`,
    });
    
    navigate('/menu');
  };
  
  const calculateTotalPrice = (
    item: MenuItem, 
    options: Record<string, string | string[]>
  ): number => {
    let total = item.price;
    
    // Add option prices
    (item.options || []).forEach(option => {
      const selectedValue = options[option.name];
      
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
  
  return (
    <Layout title={menuItem.name} showBackButton>
      <div className="page-container">
        {/* Item Image */}
        <div 
          className="h-64 w-full bg-center bg-cover rounded-md mb-4" 
          style={{ backgroundImage: `url(${menuItem.image})` }}
        />
        
        {/* Item Details */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">{menuItem.name}</h1>
          <p className="text-muted-foreground mb-2">{menuItem.description}</p>
          
          {/* Allergies */}
          {menuItem.allergies && menuItem.allergies.length > 0 && (
            <div className="mt-2 mb-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Contains:</span> {menuItem.allergies.join(', ')}
              </p>
            </div>
          )}
          
          {/* Base Price */}
          <p className="text-xl font-bold">${menuItem.price.toFixed(2)}</p>
        </div>
        
        {/* Options */}
        {menuItem.options && menuItem.options.length > 0 && (
          <div className="mb-6 space-y-4">
            {menuItem.options.map((option: MenuItemOption) => (
              <Card key={option.name}>
                <CardContent className="p-4">
                  <Label className="text-base font-medium mb-2 block">
                    {option.name}
                    {option.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  
                  {option.multiSelect ? (
                    // Multi-select options (checkboxes)
                    <div className="space-y-2">
                      {option.choices.map((choice) => (
                        <div key={choice.name} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`${option.name}-${choice.name}`}
                            checked={(selectedOptions[option.name] as string[] || []).includes(choice.name)}
                            onCheckedChange={(checked) => {
                              handleCheckboxChange(option.name, choice.name, checked as boolean);
                            }}
                          />
                          <label 
                            htmlFor={`${option.name}-${choice.name}`}
                            className="text-sm cursor-pointer flex justify-between w-full"
                          >
                            <span>{choice.name}</span>
                            {choice.price > 0 && <span>+${choice.price.toFixed(2)}</span>}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Single-select options (radio buttons)
                    <RadioGroup 
                      value={selectedOptions[option.name] as string || ''}
                      onValueChange={(value) => handleOptionChange(option.name, value)}
                    >
                      {option.choices.map((choice) => (
                        <div key={choice.name} className="flex items-center space-x-2">
                          <RadioGroupItem value={choice.name} id={`${option.name}-${choice.name}`} />
                          <label 
                            htmlFor={`${option.name}-${choice.name}`}
                            className="text-sm cursor-pointer flex justify-between w-full"
                          >
                            <span>{choice.name}</span>
                            {choice.price > 0 && <span>+${choice.price.toFixed(2)}</span>}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Special Instructions */}
        <div className="mb-6">
          <Label htmlFor="special-instructions" className="text-base font-medium mb-2 block">
            Special Instructions
          </Label>
          <Textarea
            id="special-instructions"
            placeholder="Any special requests or allergies?"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            className="resize-none"
          />
        </div>
        
        {/* Quantity and Add to Cart */}
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-md">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => quantity > 1 && setQuantity(q => q - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-semibold">{quantity}</span>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setQuantity(q => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <Button 
              onClick={handleAddToCart}
              className="bg-restaurant-primary hover:bg-restaurant-primary/90"
            >
              Add to Cart - ${(calculateTotalPrice(menuItem, selectedOptions) * quantity).toFixed(2)}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MenuItemDetail;
