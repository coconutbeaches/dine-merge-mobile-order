
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface OrdersTableHeaderProps {
  selectAllOrders: () => void;
  selectedOrdersCount: number;
  totalOrdersCount: number;
}

const OrdersTableHeader = ({ 
  selectAllOrders, 
  selectedOrdersCount, 
  totalOrdersCount 
}: OrdersTableHeaderProps) => {
  return (
    <div className="grid grid-cols-12 gap-x-2 md:gap-x-3 font-semibold text-sm">
      <div className="col-span-1 flex items-center">
        <Checkbox 
          checked={selectedOrdersCount === totalOrdersCount && totalOrdersCount > 0} 
          onCheckedChange={selectAllOrders}
          disabled={totalOrdersCount === 0}
          aria-label="Select all orders"
        />
      </div>
      <div className="col-span-3">Customer</div>
      <div className="col-span-2">Table</div>
      <div className="col-span-2 text-right">Amount</div>
      <div className="col-span-2">Date</div>
      <div className="col-span-2">Status</div>
    </div>
  );
};

export default OrdersTableHeader;
