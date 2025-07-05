import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, GripVertical } from "lucide-react";
import type { ProductOption } from "@/types/supabaseTypes";
import { nanoid } from "nanoid";

interface ProductOptionsSectionProps {
  options: ProductOption[];
  onAddOption: () => void;
  onOptionChange: (index: number, updatedOption: ProductOption) => void;
  onDeleteOption: (index: number) => void;
}

export function ProductOptionsSection({
  options,
  onAddOption,
  onOptionChange,
  onDeleteOption,
}: ProductOptionsSectionProps) {
  const handleAddChoice = (optionIndex: number) => {
    const option = options[optionIndex];
    const newChoice = {
      id: `temp-${nanoid()}`,
      option_id: option.id,
      name: `Choice ${(option.choices?.length || 0) + 1}`,
      price_adjustment: 0,
      sort_order: option.choices?.length || 0,
    };
    
    const updatedOption = {
      ...option,
      choices: [...(option.choices || []), newChoice],
    };
    
    onOptionChange(optionIndex, updatedOption);
  };

  const handleDeleteChoice = (optionIndex: number, choiceIndex: number) => {
    const option = options[optionIndex];
    const updatedChoices = [...(option.choices || [])];
    updatedChoices.splice(choiceIndex, 1);
    
    const updatedOption = {
      ...option,
      choices: updatedChoices.map((choice, i) => ({ ...choice, sort_order: i })),
    };
    
    onOptionChange(optionIndex, updatedOption);
  };

  const handleChoiceChange = (optionIndex: number, choiceIndex: number, field: string, value: any) => {
    const option = options[optionIndex];
    const updatedChoices = [...(option.choices || [])];
    updatedChoices[choiceIndex] = {
      ...updatedChoices[choiceIndex],
      [field]: value,
    };
    
    const updatedOption = {
      ...option,
      choices: updatedChoices,
    };
    
    onOptionChange(optionIndex, updatedOption);
  };

  const handleOptionFieldChange = (optionIndex: number, field: string, value: any) => {
    const option = options[optionIndex];
    const updatedOption = {
      ...option,
      [field]: value,
    };
    onOptionChange(optionIndex, updatedOption);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Product Options</CardTitle>
          <Button type="button" onClick={onAddOption} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {options.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No options added yet. Click "Add Option" to create your first option.
          </p>
        ) : (
          options.map((option, optionIndex) => (
            <Card key={option.id} className="border border-muted">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Option {optionIndex + 1}</Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteOption(optionIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`option-name-${optionIndex}`}>Option Name</Label>
                    <Input
                      id={`option-name-${optionIndex}`}
                      value={option.name}
                      onChange={(e) => handleOptionFieldChange(optionIndex, 'name', e.target.value)}
                      placeholder="e.g., Size, Color, Add-ons"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`option-type-${optionIndex}`}>Selection Type</Label>
                    <Select
                      value={option.selection_type}
                      onValueChange={(value) => handleOptionFieldChange(optionIndex, 'selection_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Choice</SelectItem>
                        <SelectItem value="multiple">Multiple Choice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id={`option-required-${optionIndex}`}
                    checked={option.required}
                    onCheckedChange={(checked) => handleOptionFieldChange(optionIndex, 'required', checked)}
                  />
                  <Label htmlFor={`option-required-${optionIndex}`}>Required</Label>
                </div>

                {option.selection_type === 'multiple' && (
                  <div>
                    <Label htmlFor={`option-max-${optionIndex}`}>Max Selections</Label>
                    <Input
                      id={`option-max-${optionIndex}`}
                      type="number"
                      min="1"
                      value={option.max_selections || ''}
                      onChange={(e) => handleOptionFieldChange(optionIndex, 'max_selections', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Choices</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddChoice(optionIndex)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Choice
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {option.choices?.map((choice, choiceIndex) => (
                      <div key={choice.id} className="flex items-center gap-2 p-3 border rounded-lg">
                        <div className="flex-1">
                          <Input
                            value={choice.name}
                            onChange={(e) => handleChoiceChange(optionIndex, choiceIndex, 'name', e.target.value)}
                            placeholder="Choice name"
                            className="mb-2"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={choice.price_adjustment}
                            onChange={(e) => handleChoiceChange(optionIndex, choiceIndex, 'price_adjustment', parseFloat(e.target.value) || 0)}
                            placeholder="Price adjustment (0.00)"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteChoice(optionIndex, choiceIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
