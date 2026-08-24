"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { useGuestContext } from '@/context/GuestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, Minus, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatThaiCurrency } from '@/lib/utils';
import { calculateTotalPrice } from '@/utils/productUtils';
import { hasGuestSession } from '@/utils/guestSession';
import { resetRestaurantToastOrderSession } from '@/lib/restaurantToastSession';

export default function Page() {
  const router = useRouter();
  const {
    cart,
    removeFromCart,
    updateCartItemQuantity,
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

  useEffect(() => {
    if (scannedTableNumber && scannedTableNumber !== tableNumber) {
      setTableNumber(scannedTableNumber);
    }
  }, [scannedTableNumber, tableNumber]);

  const tableNumbers = useMemo(() => {
    const nums = ['Take Away'];
    for (let i = 1; i <= 40; i++) nums.push(i.toString());
    return nums;
  }, []);

  const formatTableDisplay = (value: string) =>
    value === 'Take Away' ? 'Take Away' : `Table ${value}`;

  const handleQuantityChange = (
    cartItemId: string,
    currentQuantity: number,
    change: number
  ) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
    } else {
      updateCartItemQuantity(cartItemId, newQuantity);
    }
  };

  const handlePlaceOrder = useCallback(async () => {
    if (!currentUser && !hasGuestSession()) {
      toast.error('Please sign in or create an account to place your order.');
      router.push('/login?returnTo=/cart');
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const placedOrder = await placeOrder(
        null,
        'Cash on Delivery',
        tableNumber
      );

      if (!placedOrder) {
        toast.error('Failed to place order. Please try again.');
        return;
      }

      toast.success('Order placed successfully!');
      if (!adminCustomerContext) {
        resetRestaurantToastOrderSession();
      }
      clearCart();
      setAdminCustomerContext?.(null);

      const refFragment = new URLSearchParams({
        ref: placedOrder.restaurant_order_ref,
      }).toString();
      router.push(`/order/${placedOrder.id}/confirmation#${refFragment}`);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  }, [
    currentUser,
    cart.length,
    router,
    placeOrder,
    tableNumber,
    adminCustomerContext,
    clearCart,
    setAdminCustomerContext,
  ]);

  const grandTotal = cartTotal;

  if (cart.length === 0) {
    return (
      <Layout title="" showBackButton>
        <div className="page-container text-center py-10">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">
            Add items from the menu to get started
          </p>
          <Button onClick={() => router.push('/menu')} className="bg-black text-white hover:bg-gray-800">
            Browse Menu
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="" showBackButton>
      <div className="page-container pb-8">
        {adminCustomerContext && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-3 mb-4 rounded">
            <p className="font-bold">
              Placing order for: {adminCustomerContext.customerName}
            </p>
          </div>
        )}

        <div className="mb-6">
          <div className="space-y-3">
            {cart.map((item) => {
              const itemTotalWithOptions = calculateTotalPrice(
                item.menuItem,
                item.selectedOptions || {}
              );
              const lineItemTotal = itemTotalWithOptions * item.quantity;

              return (
                <Card key={item.id} className="food-card">
                  <CardContent className="p-3">
                    <div className="flex">
                      <div
                        className="w-16 h-16 rounded-md mr-3 bg-center bg-cover flex-shrink-0"
                        style={{
                          backgroundImage: `url(${item.menuItem.image || '/placeholder.svg'})`,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3
                            className="font-semibold truncate"
                            title={item.menuItem.name}
                          >
                            {item.menuItem.name}
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {item.selectedOptions &&
                          Object.keys(item.selectedOptions).length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <p className="truncate">
                                {Object.values(item.selectedOptions)
                                  .flat()
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                            </div>
                          )}

                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity, -1)
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity, 1)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatThaiCurrency(lineItemTotal)}
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-xs text-muted-foreground">
                                {formatThaiCurrency(itemTotalWithOptions)} each
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-5">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatThaiCurrency(grandTotal)}</span>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Table Number</h2>
              <Select
                value={tableNumber}
                onValueChange={(value) => {
                  setTableNumber(value);
                  setTableNumberCtx(value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select table number">
                    {tableNumber ? formatTableDisplay(tableNumber) : 'Select table number'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  side="top"
                  align="center"
                  position="popper"
                  className="z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px] max-h-[300px] overflow-auto"
                  sideOffset={8}
                >
                  {tableNumbers.map((number) => (
                    <SelectItem
                      key={number}
                      value={number}
                      className="pl-8 pr-3 py-2 text-sm hover:bg-gray-100 rounded-md cursor-pointer transition-colors relative"
                    >
                      {formatTableDisplay(number)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handlePlaceOrder}
              className="w-full bg-black hover:bg-gray-800 text-white"
              disabled={isPlacingOrder || cart.length === 0}
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                <>Place Order {formatThaiCurrency(grandTotal)}</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
