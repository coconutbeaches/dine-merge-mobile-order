'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';
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
      if (field === 'quantity') {
        newItems[index][field] = value === '' ? '' : Number(value);
      } else if (field === 'price') {
        newItems[index][field] = value === '' ? '' : Number(value);
      } else {
        newItems[index][field] = value;
      }
    }
    setItems(newItems);
  };

  const handleRemoveItem = (indexToRemove: number) => {
    setItems(prevItems => prevItems.filter((_, index) => index !== indexToRemove));
  };

  const handleAddItem = () => {
    setItems(prevItems => [
      { product: '', quantity: 1, price: 0, selectedOptions: {} },
      ...prevItems,
    ]);
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
    onSave(updatedOrder);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg">Edit Order {order.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Label htmlFor="orderDate" className="w-full sm:w-1/4 text-left sm:text-right">Date</Label>
            <div className="flex flex-1 gap-2">
              <Input id="orderDate" type="date" value={orderDate} onChange={handleDateChange} className="flex-1" />
              <Label htmlFor="orderTime" className="sr-only">Time</Label>
              <Input id="orderTime" type="time" value={orderTime} onChange={handleTimeChange} className="flex-1" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Label htmlFor="tableNumber" className="w-full sm:w-1/4 text-left sm:text-right">Table</Label>
            <Input id="tableNumber" value={tableNumber} onChange={handleTableNumberChange} className="flex-1" />
          </div>
          <div className="flex justify-between items-center mt-4 pt-2 border-t">
            <h4 className="font-semibold">Order Items</h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddItem}
              className="flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                id={`item-name-${index}`}
                value={item.product || item.name || (item.menuItem && item.menuItem.name) || ''}
                onChange={e => handleItemChange(index, 'product', e.target.value)}
                className="flex-[2]"
                placeholder="Item Name"
                aria-label="Item name"
              />
              <Input
                id={`item-quantity-${index}`}
                type="text"
                value={item.quantity === 0 && items[index]?.quantity === '' ? '' : item.quantity}
                onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                className="w-16 text-center"
                placeholder="Qty"
              />
              <div className="relative w-20">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">฿</span>
                <Input
                  id={`item-price-${index}`}
                  type="text"
                  value={item.price === 0 && items[index]?.price === '' ? '' : item.price}
                  onChange={e => handleItemChange(index, 'price', e.target.value)}
                  className="w-full text-right pl-6"
                  placeholder="Price"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveItem(index)}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-black text-white hover:bg-gray-800">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderEditDialog;