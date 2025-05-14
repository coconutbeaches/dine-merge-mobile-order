
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle } from 'lucide-react';
import { formatThaiCurrency } from '@/lib/utils';
import { MenuItem } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, placeOrder, currentUser, isLoggedIn, isLoading: isLoadingAppContext } = useAppContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableNumber, setTableNumber] = useState<string>('Take Away');
  
  // Redirect if not logged in
  React.useEffect(() => {
    if (!isLoadingAppContext && !isLoggedIn) {
      toast({
        title: "Sign in required",
        description: "Please sign in or create an account to checkout",
        variant: "destructive"
      });
      navigate('/login', { state: { returnTo: '/checkout' } });
    }
  }, [isLoggedIn, navigate, toast, isLoadingAppContext]);
  
  // Redirect if cart is empty
  React.useEffect(() => {
    if (!isLoadingAppContext && cart.length === 0 && isLoggedIn) {
      navigate('/menu');
    }
  }, [cart, navigate, isLoggedIn, isLoadingAppContext]);
  
  const handlePlaceOrder = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to place an order.",
        variant: "destructive",
      });
      navigate('/login', { state: { returnTo: '/checkout' } });
      return;
    }
    
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Your cart is empty. Please add items to proceed.",
        variant: "destructive",
      });
      navigate('/menu');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const mockAddress = {
        id: 'default-address',
        street: currentUser.name || 'N/A',
        city: 'Online Order',
        state: 'TH',
        zipCode: 'N/A',
        isDefault: true
      };
      
      const paymentMethod = 'Cash on Delivery';
      
      const order = await placeOrder(mockAddress, paymentMethod, tableNumber);
      
      if (order) {
        navigate('/order-history');
      } else {
        throw new Error("Order placement failed, no order data returned.");
      }
      
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast({
        title: "Error placing order",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate table numbers for dropdown
  const generateTableNumbers = () => {
    const options = [];
    options.push(
      <SelectItem key="take-away" value="Take Away">
        Take Away
      </SelectItem>
    );
    
    for (let i = 1; i <= 40; i++) {
      options.push(
        <SelectItem key={i} value={i.toString()}>
          Table {i}
        </SelectItem>
      );
    }
    
    return options;
  };
  
  if (isLoadingAppContext || (!isLoggedIn && !isLoadingAppContext) || (cart.length === 0 && isLoggedIn && !isLoadingAppContext)) {
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
      <div className="page-container pb-20">
        <div className="mb-6">
          <h2 className="section-heading">Review Your Order</h2>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={`${item.menuItem.id}-${index}`} className="flex justify-between py-1">
                    <div>
                      <span className="font-medium">
                        {item.quantity} x {item.menuItem.name}
                      </span>
                      {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {Object.entries(item.selectedOptions).map(([optionName, value]) => {
                            const displayValue = Array.isArray(value) ? value.join(', ') : value;
                            if (displayValue) {
                              return <p key={optionName}>{optionName}: {displayValue}</p>;
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {formatThaiCurrency(calculateTotalPrice(item.menuItem, item.selectedOptions || {}) * item.quantity)}
                    </div>
                  </div>
                ))}
                
                <Separator className="my-3" />
                
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatThaiCurrency(cartTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mb-6">
          <h2 className="section-heading">Table Number</h2>
          <Card>
            <CardContent className="p-4">
              <div className="grid w-full items-center gap-1.5">
                <label htmlFor="tableNumber" className="text-sm font-medium">
                  Select your table number or choose Take Away
                </label>
                <Select value={tableNumber} onValueChange={setTableNumber}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select table number" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateTableNumbers()}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-md">
          <div className="max-w-lg mx-auto">
            <Button 
              onClick={handlePlaceOrder}
              className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
              disabled={isSubmitting || cart.length === 0}
            >
              {isSubmitting ? (
                "Processing..."
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Place Order - {formatThaiCurrency(cartTotal)}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Helper function from productUtils, co-located for simplicity
const calculateTotalPrice = (
  item: MenuItem, 
  options: Record<string, string | string[]>
): number => {
  let total = item.price;
  (item.options || []).forEach(option => {
    const selectedValue = options[option.name];
    if (option.multiSelect && Array.isArray(selectedValue)) {
      selectedValue.forEach(value => {
        const choice = option.choices.find(c => c.name === value);
        if (choice) total += choice.price;
      });
    } else if (!Array.isArray(selectedValue)) {
      const choice = option.choices.find(c => c.name === selectedValue);
      if (choice) total += choice.price;
    }
  });
  return total;
};

export default Checkout;
