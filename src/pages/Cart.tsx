
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
// Separator import removed as it's not used directly in this simplified version
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { formatThaiCurrency } from '@/lib/utils';
import { calculateTotalPrice } from '@/utils/productUtils'; // For accurate item total

const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateCartItemQuantity, cartTotal, isLoggedIn } = useAppContext();
  const { toast } = useToast();
  
  const handleQuantityChange = (itemId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity <= 0) {
      // Create a unique ID for this specific cart item instance if options make it unique
      // For now, assuming itemId (product.id) is sufficient if specialInstructions and detailed options uniqueness is handled by AppContext
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
      navigate('/login', { state: { returnTo: '/cart' } }); // Redirect to login, then back to cart
      return;
    }
    
    navigate('/checkout');
  };
  
  const grandTotal = cartTotal; // Simplified total
  
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
      <div className="page-container pb-20"> {/* Added pb-20 for bottom button spacing */}
        <div className="mb-6">
          <h2 className="section-heading">Cart Items</h2>
          <div className="space-y-3">
            {cart.map((item, index) => {
              // Calculate the item's total price including options
              const itemTotalWithOptions = calculateTotalPrice(item.menuItem, item.selectedOptions || {});
              const lineItemTotal = itemTotalWithOptions * item.quantity;
              
              // Create a unique key for items, especially if options can vary for the same product ID
              const itemKey = `${item.menuItem.id}-${JSON.stringify(item.selectedOptions)}-${index}`;

              return (
                <Card key={itemKey} className="food-card">
                  <CardContent className="p-3">
                    <div className="flex">
                      <div 
                        className="w-16 h-16 rounded-md mr-3 bg-center bg-cover flex-shrink-0" 
                        style={{ backgroundImage: `url(${item.menuItem.image || '/placeholder.svg'})` }}
                      />
                      <div className="flex-1 min-w-0"> {/* Added min-w-0 for flex truncation */}
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold truncate" title={item.menuItem.name}>{item.menuItem.name}</h3>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => removeFromCart(item.menuItem.id)} // Consider a more specific ID if options differentiate cart items
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {Object.entries(item.selectedOptions).map(([optionName, value]) => {
                              const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                              if (displayValue) { // Only render if there's a value
                                return <p key={optionName} className="truncate">{optionName}: {displayValue}</p>;
                              }
                              return null;
                            })}
                          </div>
                        )}
                        
                        {/* Special Instructions display removed */}
                        
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
                            <p className="font-semibold">{formatThaiCurrency(lineItemTotal)}</p>
                            {item.quantity > 1 && (
                               <p className="text-xs text-muted-foreground">{formatThaiCurrency(itemTotalWithOptions)} each</p>
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
        
        <div className="mb-16"> {/* Spacing for fixed button */}
          <h2 className="section-heading">Order Summary</h2>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatThaiCurrency(grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-md z-10">
          <div className="max-w-lg mx-auto">
            <Button 
              onClick={handleCheckout}
              className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
              disabled={cart.length === 0}
            >
              Proceed to Checkout - {formatThaiCurrency(grandTotal)}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
