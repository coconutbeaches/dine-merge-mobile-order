
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatThaiCurrency } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { calculateTotalPrice } from '@/utils/productUtils';

const Checkout = () => {
  const navigate = useNavigate();
  const {
    cart,
    cartTotal,
    clearCart,
    currentUser,
    placeOrder,
    adminCustomerContext,
    setAdminCustomerContext,
    loginOrSignup
  } = useAppContext();

  const [tableNumber, setTableNumber] = useState('Take Away');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast: toastFn } = useToast();

  const validateOrder = () => {
    const errors: {[key: string]: string} = {};
    
    if (!currentUser) {
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
      Object.values(errors).forEach(error => toast.error(error));
      return;
    }

    setIsPlacingOrder(true);
    setFormErrors({});

    try {
      console.log("Checkout: Placing order with:", {
        tableNumber
      });

      const placedOrder = await placeOrder(
        null, 
        'Cash on Delivery', 
        tableNumber
      );

      if (placedOrder) {
        toast.success('Order placed successfully!');
        clearCart();
        if (setAdminCustomerContext) {
          setAdminCustomerContext(null);
        }
        navigate('/order-confirmation', { state: { orderId: placedOrder.id } });
      } else {
        toast.error('Failed to place order. Please try again.');
      }
    } catch (error) {
      console.error("Error during order placement:", error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleLoginSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toastFn({
        title: 'Error',
        description: 'Please enter both email and password',
        variant: 'destructive'
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await loginOrSignup(email, password, name);
      if (result.success) {
        if (result.a_new_user_was_created) {
          toastFn({
            title: 'Welcome!',
            description: 'Your account has been created successfully.'
          });
        } else {
          toastFn({
            title: 'Logged in',
            description: 'Login successful.'
          });
        }
      } else {
        toastFn({
          title: 'Error',
          description: result.error || 'An unknown error occurred. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[Checkout] Login/Signup error:', error);
      toastFn({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Generate table numbers 1-40
  const generateTableNumbers = () => {
    const numbers = ['Take Away'];
    for (let i = 1; i <= 40; i++) {
      numbers.push(i.toString());
    }
    return numbers;
  };

  const tableNumbers = generateTableNumbers();

  return (
    <Layout title="Checkout" showBackButton={true}>
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Checkout</CardTitle>
            {adminCustomerContext && (
              <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-3 mt-2 rounded">
                <p className="font-bold">Placing order for: {adminCustomerContext.customerName}</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {!currentUser && (
              <form onSubmit={handleLoginSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoggingIn} className="w-full">
                  {isLoggingIn ? 'Processing...' : 'Login / Signup'}
                </Button>
              </form>
            )}
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="inline-block h-10 w-10 text-yellow-500 mb-2" />
                <p className="text-lg font-semibold">Your cart is empty.</p>
                <p className="text-muted-foreground">Add items to your cart to proceed to checkout.</p>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate('/menu')}
                >
                  Browse Menu
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Order Summary</h2>
                  {cart.map((item) => {
                    const itemTotalWithOptions = calculateTotalPrice(
                      item.menuItem,
                      item.selectedOptions || {}
                    );
                    const lineItemTotal = itemTotalWithOptions * item.quantity;
                    const optionsString = item.selectedOptions
                      ? Object.values(item.selectedOptions).flat().filter(Boolean).join(', ')
                      : '';

                    return (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-baseline space-x-2">
                            <span className="font-medium">{item.quantity}x</span>
                            <span className="font-semibold">{item.menuItem.name}</span>
                          </div>
                          {optionsString && (
                            <p className="text-sm text-muted-foreground pl-6">
                              {optionsString}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold">{formatThaiCurrency(lineItemTotal)}</span>
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatThaiCurrency(cartTotal)}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-3">Table Number</h2>
                  <Select 
                    value={tableNumber} 
                    onValueChange={setTableNumber}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select table number" />
                    </SelectTrigger>
                    <SelectContent>
                      {tableNumbers.map((number) => (
                        <SelectItem key={number} value={number}>
                          {number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
          
          {cart.length > 0 && (
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handlePlaceOrder} 
                disabled={isPlacingOrder || !currentUser || cart.length === 0}
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Place Order {formatThaiCurrency(cartTotal)}</>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Checkout;
