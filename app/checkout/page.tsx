"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatThaiCurrency } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { useGuestContext } from '@/context/GuestContext';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { calculateTotalPrice } from '@/utils/productUtils';
import { hasGuestSession } from '@/utils/guestSession';

export default function CheckoutPage() {
  const router = useRouter();
  const {
    cart,
    cartTotal,
    clearCart,
    currentUser,
    placeOrder,
    adminCustomerContext,
    setAdminCustomerContext,
  } = useAppContext();
  const { tableNumber: scannedTableNumber, setTableNumber: setTableNumberCtx } = useGuestContext();
  const [tableNumber, setTableNumber] = useState(scannedTableNumber ?? 'Take Away');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string,string>>({});

  // Helper function to format table display
  const formatTableDisplay = (value: string) => {
    return value === 'Take Away' ? 'Take Away' : `Table ${value}`;
  };

  useEffect(() => {
    if (scannedTableNumber && scannedTableNumber !== tableNumber) {
      setTableNumber(scannedTableNumber);
    }
  }, [scannedTableNumber]);

  const validateOrder = () => {
    const errors: Record<string,string> = {};
    if (!currentUser && !hasGuestSession()) {
      errors.user = 'You must be logged in to place an order.';
    }
    if (cart.length === 0) {
      errors.cart = 'Your cart is empty.';
    }
    return errors;
  };

  const handlePlaceOrder = async () => {
    const errors = validateOrder();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      Object.values(errors).forEach(msg => toast.error(msg));
      return;
    }

    setIsPlacingOrder(true);
    setFormErrors({});
    try {
      const placedOrder = await placeOrder(
        null,
        'Cash on Delivery',
        tableNumber
      );
      if (placedOrder) {
        toast.success('Order placed successfully!');
        clearCart();
        setAdminCustomerContext?.(null);
        router.push(`/order/${placedOrder.id}/confirmation`);
      } else {
        toast.error('Failed to place order. Please try again.');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const generateTableNumbers = () => {
    const nums = ['Take Away'];
    for (let i = 1; i <= 40; i++) nums.push(i.toString());
    return nums;
  };
  const tableNumbers = generateTableNumbers();

  if (cart.length === 0) {
    return (
      <Layout title="" showBackButton>
        <div className="page-container text-center py-10">
          <ShoppingBag className="inline-block h-10 w-10 text-muted-foreground mb-2" />
          <h2 className="text-xl font-bold mb-2">Your cart is empty.</h2>
          <p className="text-muted-foreground mb-6">Add items to your cart to proceed.</p>
          <Button className="bg-black text-white hover:bg-gray-800" onClick={() => router.push('/')}>Browse Menu</Button>
        </div>
      </Layout>
    );
  }

  const grandTotal = cartTotal;
  return (
    <Layout title="Checkout" showBackButton>
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Checkout</CardTitle>
            {adminCustomerContext && (
              <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-3 mt-2 rounded">
                <p className="font-bold">
                  Placing order for: {adminCustomerContext.customerName}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {cart.map(item => {
              const itemTotal = calculateTotalPrice(item.menuItem, item.selectedOptions||{});
              const lineTotal = itemTotal * item.quantity;
              return (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1 space-y-1">
                    <span className="font-medium">{item.quantity} ×</span>
                    <span className="font-semibold">{item.menuItem.name}</span>
                  </div>
                  <span className="font-semibold">{formatThaiCurrency(lineTotal)}</span>
                </div>
              );
            })}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{formatThaiCurrency(grandTotal)}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Table Number</h2>
              <Select value={tableNumber} onValueChange={(val) => {
                setTableNumber(val);
                setTableNumberCtx(val);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select table number">
                    {tableNumber ? formatTableDisplay(tableNumber) : "Select table number"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent 
                  side="top" 
                  align="center" 
                  position="popper"
                  className="z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px] max-h-[300px] overflow-auto" 
                  sideOffset={8}
                >
                  {tableNumbers.map(n => (
                    <SelectItem 
                      key={n} 
                      value={n} 
                      className="pl-8 pr-3 py-2 text-sm hover:bg-gray-100 rounded-md cursor-pointer transition-colors relative"
                    >
                      {n === 'Take Away' ? 'Take Away' : `Table ${n}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-black text-white hover:bg-gray-800"
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || (!currentUser && !hasGuestSession()) || cart.length===0}
            >
              {isPlacingOrder ? <><Loader2 className="animate-spin mr-2"/>Processing...</> : <>Place Order {formatThaiCurrency(grandTotal)}</>}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}