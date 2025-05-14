
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatThaiCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Address, CartItem } from '@/types'; // Ensure MenuItem is imported if CartItem uses it, or it's part of types/index.ts

const Checkout = () => {
  const navigate = useNavigate();
  const { 
    cart, 
    cartTotal, 
    placeOrder, 
    currentUser, 
    isLoggedIn, 
    isLoading: isLoadingAppContext // Renamed to avoid conflict
  } = useAppContext();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  // Removed address state as per previous refactor to simplify (assuming take-away or table number for now)
  // const [street, setStreet] = useState('');
  // const [city, setCity] = useState('');
  // const [zipCode, setZipCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // Default to cash
  const [tableNumber, setTableNumber] = useState('Take Away'); // Default to Take Away
  const [tip, setTip] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoadingAppContext && !isLoggedIn) {
      navigate('/login', { state: { returnTo: '/checkout' } });
    }
    if (currentUser) {
      setName(currentUser.name || '');
      // Assuming phone is part of currentUser or fetched separately
      // For now, if currentUser has phone, use it.
      setPhone(currentUser.phone || ''); 
    }
    if (cart.length === 0 && !isLoadingAppContext) {
      toast.info("Your cart is empty. Add some items before checking out.");
      navigate('/menu');
    }
  }, [currentUser, isLoggedIn, isLoadingAppContext, navigate, cart.length]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Create a dummy address object or null if not collecting full address for take-away/table orders
    const orderAddress: Address | null = null; 
    // Example if needed:
    // const orderAddress: Address = { id: 'checkout-address', street, city, state: 'N/A', zipCode, isDefault: false };


    try {
      const order = await placeOrder(orderAddress, paymentMethod, tableNumber, tip);
      if (order) {
        toast.success(`Order #${order.id.substring(0,8)} placed successfully!`);
        navigate(`/order-history`); // Or a specific order confirmation page
      } else {
        toast.error('Failed to place order. Please try again.');
      }
    } catch (error: any) {
      toast.error(`Error placing order: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const subtotal = cartTotal;
  const totalWithTip = subtotal + tip;

  const tableNumberOptions = ['Take Away', ...Array.from({ length: 40 }, (_, i) => (i + 1).toString())];

  if (isLoadingAppContext) {
    return <Layout title="Checkout"><div className="page-container text-center">Loading...</div></Layout>;
  }

  return (
    <Layout title="Checkout" showBackButton>
      <div className="page-container max-w-2xl mx-auto">
        <form onSubmit={handlePlaceOrder}>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8"> {/* Simplified to single column for now */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={isLoading} />
                  </div>
                  <div>
                    <Label htmlFor="tableNumber">Table Number / Order Type</Label>
                    <Select value={tableNumber} onValueChange={setTableNumber} disabled={isLoading}>
                      <SelectTrigger id="tableNumber">
                        <SelectValue placeholder="Select Table or Take Away" />
                      </SelectTrigger>
                      <SelectContent>
                        {tableNumberOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option === 'Take Away' ? 'Take Away' : `Table ${option}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup defaultValue="cash" value={paymentMethod} onValueChange={setPaymentMethod} disabled={isLoading}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash">Cash</Label>
                    </div>
                    {/* Add other payment methods if needed */}
                    {/* <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card">Credit Card (Online - Coming Soon)</Label>
                    </div> */}
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            <div> {/* This was the second column, now stacked */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {cart.map((item: CartItem) => (
                    <div key={item.menuItem.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <div>
                        <p className="font-medium">{item.menuItem.name} (×{item.quantity})</p>
                        {/* Optionally show selected options */}
                      </div>
                      <p>{formatThaiCurrency(item.menuItem.price * item.quantity)}</p>
                    </div>
                  ))}
                  <div className="py-3 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatThaiCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Label htmlFor="tip" className="flex-shrink-0 mr-2">Tip (Optional)</Label>
                      <div className="flex items-center">
                        <span className="mr-1">฿</span>
                        <Input 
                          id="tip" 
                          type="number" 
                          value={tip === 0 ? '' : tip.toString()} // Show empty if tip is 0
                          onChange={(e) => setTip(Math.max(0, parseFloat(e.target.value) || 0))} 
                          className="w-20 text-right"
                          placeholder="0"
                          min="0"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total</span>
                      <span>{formatThaiCurrency(totalWithTip)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading || cart.length === 0}>
                    {isLoading ? 'Placing Order...' : `Place Order (${formatThaiCurrency(totalWithTip)})`}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Checkout;
