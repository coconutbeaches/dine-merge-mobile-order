"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface QuantitySelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
}

const QuantitySelector = React.forwardRef<
  HTMLDivElement,
  QuantitySelectorProps
>(({ value, onChange, min = 0, max, className, ...props }, ref) => {
  const [quantity, setQuantity] = React.useState(value);

  React.useEffect(() => {
    setQuantity(value);
  }, [value]);

  const handleDecrement = () => {
    const newQuantity = Math.max(min, quantity - 1);
    setQuantity(newQuantity);
    onChange(newQuantity);
  };

  const handleIncrement = () => {
    const newQuantity = max !== undefined ? Math.min(max, quantity + 1) : quantity + 1;
    setQuantity(newQuantity);
    onChange(newQuantity);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center space-x-2 border border-gray-300 rounded-md px-2 py-1",
        className
      )}
      {...props}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={quantity <= min}
        className="text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
      >
        -
      </button>
      <span className="font-medium text-lg">{quantity}</span>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={max !== undefined && quantity >= max}
        className="text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
      >
        +
      </button>
    </div>
  );
});
QuantitySelector.displayName = "QuantitySelector";

export { QuantitySelector };
