
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { formatThaiCurrency } from '@/lib/utils'; // Import the formatter

interface QuantityAddToCartProps {
  quantity: number;
  totalPrice: number;
  onQuantityDecrease: () => void;
  onQuantityIncrease: () => void;
  onAddToCart: () => void;
}

const QuantityAddToCart: React.FC<QuantityAddToCartProps> = ({
  quantity,
  totalPrice,
  onQuantityDecrease,
  onQuantityIncrease,
  onAddToCart
}) => {
  return (
    <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-md">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={onQuantityDecrease}
            disabled={quantity <= 1}
            className="border-black text-black"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="font-semibold">{quantity}</span>
          <Button 
            variant="outline" 
            size="icon"
            onClick={onQuantityIncrease}
            className="border-black text-black"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <Button 
          onClick={onAddToCart}
          className="bg-black hover:bg-black/90 text-white"
        >
          Add to Cart - {formatThaiCurrency(totalPrice)}
        </Button>
      </div>
    </div>
  );
};

export default QuantityAddToCart;
