
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateCartItemQuantity, cartTotal, isLoggedIn } = useAppContext();
  const { toast } = useToast();
  
  const handleQuantityChange = (itemId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      updateCartItemQuantity(itemId, newQuantity);
    }
  };
  
  const handleCheckout = () => {
    if (!isLoggedIn) {
      toast({
        title: "Sign in required",
        description: "Please sign in or create an account to checkout",
        variant: "destructive"
      });
      navigate('/login', { state: { returnTo: '/cart' } });
      return;
    }
    
    navigate('/checkout');
  };
  
  // Simplified - no delivery fee, service fee, and tax
  const grandTotal = cartTotal;
  
  if (cart.length === 0) {
    return (
      <Layout title="Your Cart" showBackButton>
        <div className="page-container text-center py-10">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Add items from the menu to get started</p>
          <Button onClick={() => navigate('/menu')}>Browse Menu</Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title="Your Cart" showBackButton>
      <div className="page-container">
        {/* Cart Items */}
        <div className="mb-6">
          <h2 className="section-heading">Cart Items</h2>
          <div className="space-y-3">
            {cart.map((item, index) => {
              // Calculate the item price with options
              let itemPrice = item.menuItem.price;
              
              // Add option prices if there are any
              if (item.selectedOptions && item.menuItem.options) {
                item.menuItem.options.forEach(option => {
                  if (option.multiSelect) {
                    const selectedValues = item.selectedOptions?.[option.name] as string[] || [];
                    selectedValues.forEach(value => {
                      const choice = option.choices.find(c => c.name === value);
                      if (choice) {
                        itemPrice += choice.price;
                      }
                    });
                  } else {
                    const selectedValue = item.selectedOptions?.[option.name] as string;
                    const choice = option.choices?.find(c => c.name === selectedValue);
                    if (choice) {
                      itemPrice += choice.price;
                    }
                  }
                });
              }
              
              return (
                <Card key={`${item.menuItem.id}-${index}`} className="food-card">
                  <CardContent className="p-3">
                    <div className="flex">
                      <div 
                        className="w-16 h-16 rounded-md mr-3 bg-center bg-cover" 
                        style={{ backgroundImage: `url(${item.menuItem.image})` }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold">{item.menuItem.name}</h3>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeFromCart(item.menuItem.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Selected Options */}
                        {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
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
                        
                        {/* Special Instructions */}
                        {item.specialInstructions && (
                          <p className="text-xs text-muted-foreground italic mt-1">
                            "{item.specialInstructions}"
                          </p>
                        )}
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(item.menuItem.id, item.quantity, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium">{item.quantity}</span>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(item.menuItem.id, item.quantity, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">฿{Math.round(itemPrice * item.quantity)}</p>
                            <p className="text-xs text-muted-foreground">฿{Math.round(itemPrice)} each</p>
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
        
        {/* Order Summary - simplified */}
        <div className="mb-16">
          <h2 className="section-heading">Order Summary</h2>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>฿{Math.round(grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Checkout Button - Fixed at bottom */}
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-md">
          <div className="max-w-lg mx-auto">
            <Button 
              onClick={handleCheckout}
              className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
            >
              Proceed to Checkout - ฿{Math.round(grandTotal)}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
