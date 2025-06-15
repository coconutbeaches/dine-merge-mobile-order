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
  const { cart, cartTotal, clearCart, currentUser, placeOrder } = useAppContext();

  const [tableNumber, setTableNumber] = useState('Take Away');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

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
          </CardHeader>
          <CardContent className="space-y-6">
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
