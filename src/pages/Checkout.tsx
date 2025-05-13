
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBag, CheckCircle } from 'lucide-react';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, placeOrder, currentUser, isLoggedIn } = useAppContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Redirect if not logged in
  React.useEffect(() => {
    if (!isLoggedIn) {
      toast({
        title: "Sign in required",
        description: "Please sign in or create an account to checkout",
        variant: "destructive"
      });
      navigate('/login', { state: { returnTo: '/checkout' } });
    }
  }, [isLoggedIn, navigate, toast]);
  
  // Redirect if cart is empty
  React.useEffect(() => {
    if (cart.length === 0) {
      navigate('/cart');
    }
  }, [cart, navigate]);
  
  const handlePlaceOrder = async () => {
    if (!currentUser) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // For now, we'll use a mock address and payment method
      const mockAddress = {
        id: 'default-address',
        street: '123 Main St',
        city: 'Demo City',
        state: 'CA',
        zipCode: '12345',
        isDefault: true
      };
      
      await placeOrder(mockAddress, 'Credit Card');
      
      // Show success toast
      toast({
        title: "Order placed successfully!",
        description: "Thank you for your order.",
        variant: "success"
      });
      
      // Redirect to order history or confirmation page
      navigate('/order-history');
      
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Error placing order",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isLoggedIn || cart.length === 0) {
    return null; // Will be redirected by useEffect
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
                            if (Array.isArray(value)) {
                              return value.length > 0 ? (
                                <p key={optionName}>{optionName}: {value.join(', ')}</p>
                              ) : null;
                            }
                            return <p key={optionName}>{optionName}: {value}</p>;
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      ${(item.menuItem.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
                
                <Separator className="my-3" />
                
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mb-6">
          <h2 className="section-heading">Delivery Details</h2>
          <Card>
            <CardContent className="p-4">
              <p className="mb-2">Deliver to:</p>
              <p className="font-medium">{currentUser?.name}</p>
              <p>123 Main St</p>
              <p>Demo City, CA 12345</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="mb-16">
          <h2 className="section-heading">Payment Method</h2>
          <Card>
            <CardContent className="p-4">
              <p>Credit Card (ending in 1234)</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Place Order Button - Fixed at bottom */}
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-md">
          <div className="max-w-lg mx-auto">
            <Button 
              onClick={handlePlaceOrder}
              className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Processing..."
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Place Order - ${cartTotal.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
