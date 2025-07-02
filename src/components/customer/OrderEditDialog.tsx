import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { format } from 'date-fns';

interface OrderItem {
  product?: string;
  name?: string;
  menuItem?: { name: string; price: number };
  price: number;
  quantity: number;
  selectedOptions?: Record<string, string[] | string>;
}

interface OrderEditDialogProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedOrder: Order) => void;
}

const OrderEditDialog: React.FC<OrderEditDialogProps> = ({ order, isOpen, onClose, onSave }) => {
  const [orderDate, setOrderDate] = useState<string>(format(new Date(order.created_at), 'yyyy-MM-dd'));
  const [orderTime, setOrderTime] = useState<string>(format(new Date(order.created_at), 'HH:mm'));
  const [tableNumber, setTableNumber] = useState<string>(order.table_number || '');
  const [items, setItems] = useState<OrderItem[]>(order.order_items || []);

  useEffect(() => {
    // This useEffect is now only for handling dialog open/close side effects if needed,
    // not for re-initializing state from props.
    // The state is initialized directly in useState calls above.
  }, [isOpen]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrderDate(e.target.value);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrderTime(e.target.value);
  };

  const handleTableNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTableNumber(e.target.value);
  };

  const handleItemChange = <K extends keyof OrderItem>(index: number, field: K, value: OrderItem[K]) => {
    const newItems = [...items];
    if (newItems[index]) {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const handleSave = () => {
    const combinedDateTime = new Date(`${orderDate}T${orderTime}:00`).toISOString();
    
    // Recalculate total_amount based on updated items
    const newTotalAmount = items.reduce((sum, item) => {
      const itemPrice = item.price || (item.menuItem && item.menuItem.price) || 0;
      return sum + (itemPrice * item.quantity);
    }, 0);

    const updatedOrder = {
      ...order,
      created_at: combinedDateTime,
      table_number: tableNumber,
      order_items: items,
      total_amount: newTotalAmount, // Update total_amount
    };
    console.log("Items before save:", items);
    console.log("New total amount calculated:", newTotalAmount);
    console.log("Updated order before save:", updatedOrder);
    onSave(updatedOrder);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Order #{order.id.toString().padStart(4, '0')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="orderDate" className="text-right">Date</Label>
            <Input id="orderDate" type="date" value={orderDate} onChange={handleDateChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="orderTime" className="text-right">Time</Label>
            <Input id="orderTime" type="time" value={orderTime} onChange={handleTimeChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tableNumber" className="text-right">Table No.</Label>
            <Input id="tableNumber" value={tableNumber} onChange={handleTableNumberChange} className="col-span-3" />
          </div>
          <h4 className="font-semibold mt-4">Order Items</h4>
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={`item-name-${index}`} className="text-right">Item</Label>
              <Input
                id={`item-name-${index}`}
                value={item.product || item.name || (item.menuItem && item.menuItem.name) || ''}
                onChange={e => handleItemChange(index, 'product', e.target.value)}
                className="col-span-3"
              />
              <Label htmlFor={`item-quantity-${index}`} className="text-right">Qty</Label>
              <Input
                id={`item-quantity-${index}`}
                type="number"
                value={item.quantity}
                onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                className="col-span-3"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderEditDialog;
