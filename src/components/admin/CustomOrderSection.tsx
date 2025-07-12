'use client';
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { createCustomOrder, CustomOrderItem } from '@/services/orderService';
import { toast } from 'sonner';

interface CustomOrderSectionProps {
  customerId: string;
  customerName: string | null;
}

const emptyItem = (): CustomOrderItem & { id: string } => ({
  id: crypto.randomUUID(),
  product: '',
  price: 0,
  quantity: 1,
});

const CustomOrderSection: React.FC<CustomOrderSectionProps> = ({ customerId, customerName }) => {
  const [items, setItems] = useState<(CustomOrderItem & { id: string })[]>([]);
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [orderTime, setOrderTime] = useState<string>(new Date().toTimeString().slice(0,5));
  const [showForm, setShowForm] = useState(false);

  const addItem = () => {
    if (!showForm) {
      setShowForm(true);
    }
    setItems(prev => [emptyItem(), ...prev]);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, field: keyof CustomOrderItem, value: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };
  const submit = async () => {
    if (items.length === 0) return;
    try {
      // Combine date and time properly
      const dateTimeString = `${orderDate}T${orderTime}:00`;
      const dateTime = new Date(dateTimeString);
      
      await createCustomOrder(customerId, customerName, items.map(({id, ...rest}) => rest), dateTime.toISOString());
      toast.success('Custom order created');
      setItems([]);
      setShowForm(false);
    } catch (e:any) {
      console.error(e);
      toast.error('Failed to create custom order');
    }
  };
  return (
    <Card className="p-4 mb-6 space-y-4 transition-all duration-300 ease-in-out">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Custom Order</h3>
        <Button type="button" variant="outline" size="icon" onClick={addItem}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          showForm ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-50'
        }`}
      >
        <div className="space-y-4 pt-4">
          {items.map(item => (
            <div key={item.id} className="flex gap-2 items-end">
              <Input
                placeholder="Name"
                value={item.product}
                onChange={e => updateItem(item.id, 'product', e.target.value)}
                className="flex-[2] min-w-0"
                aria-label="Product name"
              />
              <div className="w-20 flex-shrink-0">
                <div className="relative">
                  <span className="absolute left-0 inset-y-0 flex items-center pl-2 text-gray-500 text-sm">฿</span>
                  <Input
                    type="number"
                    placeholder="Price"
                    value={item.price}
                    onChange={e => updateItem(item.id, 'price', Number(e.target.value))}
                    className="pl-6 no-spinner text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="px-2">{item.quantity}</span>
                <Button variant="outline" size="icon" onClick={() => updateItem(item.id, 'quantity', item.quantity + 1)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-4">
          <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="w-36 hide-calendar-icon" />
          <Input type="time" value={orderTime} onChange={e => setOrderTime(e.target.value)} className="w-24" />
          <Button onClick={submit} disabled={items.length === 0} className="bg-black text-white hover:bg-gray-800">Order</Button>
        </div>
      </div>
    </Card>
  );
};

export default CustomOrderSection;
