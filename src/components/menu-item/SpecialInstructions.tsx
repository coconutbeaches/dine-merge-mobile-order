
import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SpecialInstructionsProps {
  value: string;
  onChange: (value: string) => void;
}

const SpecialInstructions: React.FC<SpecialInstructionsProps> = ({ value, onChange }) => {
  return (
    <div className="mb-6">
      <Label htmlFor="special-instructions" className="text-base font-medium mb-2 block">
        Special Instructions
      </Label>
      <Textarea
        id="special-instructions"
        placeholder="Any special requests or allergies?"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="resize-none border-gray-300"
      />
    </div>
  );
};

export default SpecialInstructions;
