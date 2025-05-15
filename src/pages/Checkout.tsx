
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatThaiCurrency } from '@/lib/utils';

// Import product related components and types
import { CartItem } from '@/types';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, placeOrder, isLoggedIn, isLoading, currentUser } = useAppContext();
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [tableNumber, setTableNumber] = useState('Take Away');
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      navigate('/login', { state: { returnTo: '/checkout' } });
    }
  }, [isLoggedIn, navigate, isLoading]);

  // Redirect to menu if cart is empty
  useEffect(() => {
    if (cart.length === 0 && !isLoading) {
      navigate('/menu');
    }
  }, [cart, navigate, isLoading]);

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      toast.error('You must be logged in to complete checkout');
      navigate('/login', { state: { returnTo: '/checkout' } });
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      navigate('/menu');
      return;
    }

    setIsProcessing(true);

    try {
      // Calculate final tip amount
      const finalTip = tip === -1 ? (customTip ? parseFloat(customTip) : 0) : tip;

      // Place the order (no address needed for restaurant pickup)
      const order = await placeOrder(null, paymentMethod, tableNumber, finalTip);
      
      if (order) {
        toast.success('Your order has been placed successfully!');
        navigate('/order-history');
      } else {
        throw new Error('Failed to place order');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Error placing your order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTipChange = (value: string) => {
    const numericValue = parseInt(value);
    setTip(numericValue);
    
    // Reset custom tip when selecting a preset amount
    if (numericValue !== -1) {
      setCustomTip('');
    }
  };

  const handleCustomTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimal points
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setCustomTip(value);
    
    // Only set tip when custom field is used
    if (value) {
      setTip(-1); // Custom tip indicator
    } else {
      setTip(0);
    }
  };

  // Computed total with tip
  const orderTotal = cartTotal + (tip === -1 ? (parseFloat(customTip) || 0) : tip);

  if (isLoading) {
    return (
      <Layout title="Checkout" showBackButton>
        <div className="page-container text-center py-10">
          <p>Loading checkout...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Checkout" showBackButton>
      <div className="page-container space-y-6">
        <h1 className="text-2xl font-bold">Checkout</h1>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {cart.map((item: CartItem) => (
              <div key={`${item.menuItem.id}-${JSON.stringify(item.selectedOptions)}`} className="py-3 flex justify-between">
                <div>
                  <p className="font-medium">{item.quantity}× {item.menuItem.name}</p>
                  {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {Object.entries(item.selectedOptions).map(([key, value]) => (
                        <div key={key}>
                          {key}: {Array.isArray(value) ? value.join(', ') : value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="font-semibold">{formatThaiCurrency(item.menuItem.price * item.quantity)}</p>
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex-col">
            <div className="flex justify-between w-full pb-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatThaiCurrency(cartTotal)}</span>
            </div>
            {tip > 0 || (tip === -1 && customTip) ? (
              <div className="flex justify-between w-full pb-4">
                <span className="text-muted-foreground">Tip</span>
                <span>{formatThaiCurrency(tip === -1 ? (parseFloat(customTip) || 0) : tip)}</span>
              </div>
            ) : null}
            <div className="flex justify-between w-full border-t pt-2">
              <span className="font-bold">Total</span>
              <span className="font-bold">{formatThaiCurrency(orderTotal)}</span>
            </div>
          </CardFooter>
        </Card>

        {/* Table Number Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Table Number</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={tableNumber} 
              onValueChange={setTableNumber}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select table number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Take Away">Take Away</SelectItem>
                {Array.from({length: 40}, (_, i) => i + 1).map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    Table {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Tip Options */}
        <Card>
          <CardHeader>
            <CardTitle>Add a Tip</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={tip.toString()} 
              onValueChange={handleTipChange}
              className="grid grid-cols-2 md:grid-cols-4 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0" id="tip-0" />
                <Label htmlFor="tip-0">No Tip</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="20" id="tip-20" />
                <Label htmlFor="tip-20">฿20</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="50" id="tip-50" />
                <Label htmlFor="tip-50">฿50</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="100" id="tip-100" />
                <Label htmlFor="tip-100">฿100</Label>
              </div>
            </RadioGroup>
            
            <div className="mt-4 flex items-center space-x-2">
              <RadioGroupItem 
                value="-1" 
                id="tip-custom" 
                checked={tip === -1}
                onCheckedChange={() => tip !== -1 && setTip(-1)} 
              />
              <Label htmlFor="tip-custom">Custom:</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                className="max-w-[150px]"
                value={customTip}
                onChange={handleCustomTipChange}
                onClick={() => tip !== -1 && setTip(-1)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              defaultValue="Cash on Delivery" 
              value={paymentMethod}
              onValueChange={setPaymentMethod}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Cash on Delivery" id="cash" />
                <Label htmlFor="cash">Cash on Delivery</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="Special instructions for your order..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Place Order Button */}
        <Button 
          className="w-full" 
          size="lg" 
          onClick={handleCheckout}
          disabled={isProcessing || !isLoggedIn || cart.length === 0}
        >
          {isProcessing ? "Processing..." : `Place Order • ${formatThaiCurrency(orderTotal)}`}
        </Button>
      </div>
    </Layout>
  );
};

export default Checkout;
