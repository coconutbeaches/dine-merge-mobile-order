
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface OrdersTableHeaderProps {
  selectAllOrders: () => void;
  selectedOrdersCount: number;
  totalOrdersCount: number;
}

const OrdersTableHeader = ({ selectAllOrders, selectedOrdersCount, totalOrdersCount }: OrdersTableHeaderProps) => {
  const isAllSelected = selectedOrdersCount === totalOrdersCount && totalOrdersCount > 0;
  const isIndeterminate = selectedOrdersCount > 0 && selectedOrdersCount < totalOrdersCount;

  return (
    <div 
      className="grid grid-cols-12 gap-x-1 md:gap-x-3 p-3 font-semibold text-sm text-muted-foreground border-b"
      style={{
        gridTemplateColumns: "min-content minmax(0,3fr) minmax(0,1.5fr) minmax(0,1.8fr) minmax(0,2fr)"
      }}
    >
      <div className="col-span-1 flex items-center min-w-[32px]">
        <Checkbox 
          checked={isAllSelected}
          ref={(el) => {
            if (el) {
              el.indeterminate = isIndeterminate;
            }
          }}
          onCheckedChange={selectAllOrders}
          aria-label="Select all orders"
        />
      </div>
      <div className="col-span-3 text-left">Customer</div>
      <div className="col-span-2 text-right">Amount</div>
      <div className="col-span-3">Date</div>
      <div className="col-span-3 text-right">Status</div>
    </div>
  );
};

export default OrdersTableHeader;
