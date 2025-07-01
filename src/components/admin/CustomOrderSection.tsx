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
  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, field: keyof CustomOrderItem, value: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };
  const submit = async () => {
    if (items.length === 0) return;
    try {
      await createCustomOrder(customerId, customerName, items.map(({id, ...rest}) => rest), new Date(orderDate).toISOString());
      toast.success('Custom order created');
      setItems([]);
    } catch (e:any) {
      console.error(e);
      toast.error('Failed to create custom order');
    }
  };
  return (
    <Card className="p-4 mb-6 space-y-4">
      <h3 className="text-lg font-semibold">Custom Order Items</h3>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex gap-2 items-end">
            <Input
              placeholder="Name"
              value={item.product}
              onChange={e => updateItem(item.id, 'product', e.target.value)}
              className="flex-1"
            />
            <div className="w-24">
              <Input
                type="number"
                placeholder="Price"
                value={item.price}
                onChange={e => updateItem(item.id, 'price', Number(e.target.value))}
              />
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
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={addItem}>
          Add custom item
        </Button>
        <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="w-36" />
        <Button onClick={submit} disabled={items.length === 0}>Submit Order</Button>
      </div>
    </Card>
  );
};

export default CustomOrderSection;
