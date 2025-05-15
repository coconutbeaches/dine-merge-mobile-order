import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatThaiCurrency } from '@/lib/utils';
import { useCartContext } from '@/context/CartContext';
import { useUserContext } from '@/context/UserContext';
import { useOrderContext } from '@/context/OrderContext';
import { AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, clearCart } = useCartContext();
  const { currentUser, updateUser } = useUserContext();
  const { placeOrder } = useOrderContext();

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [address, setAddress] = useState<Address | null>(null);
  const [newAddress, setNewAddress] = useState<Omit<Address, 'id' | 'isDefault'> | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [tip, setTip] = useState(0);
  const [customTipAmount, setCustomTipAmount] = useState('');

  useEffect(() => {
    if (currentUser && currentUser.addresses && currentUser.addresses.length > 0) {
      // Set default address
      const defaultAddress = currentUser.addresses.find(addr => addr.isDefault) || currentUser.addresses[0];
      setAddress(defaultAddress);
    }
  }, [currentUser]);

  const handlePlaceOrder = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to place an order.');
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    let addressToUse = address;

    if (isAddingNewAddress && newAddress) {
      // Optimistically update the user's address list
      const tempId = `temp-${Date.now()}`;
      const newAddressWithTempId: Address = { ...newAddress, id: tempId, isDefault: false };
      updateUser({
        ...currentUser,
        addresses: [...(currentUser.addresses || []), newAddressWithTempId],
      });

      addressToUse = newAddressWithTempId;
    }

    const placedOrder = await placeOrder(addressToUse, paymentMethod, tableNumber, tip === -1 ? Number(customTipAmount) : tip);

    if (placedOrder) {
      toast.success('Order placed successfully!');
      navigate('/order-confirmation');
    } else {
      toast.error('Failed to place order. Please try again.');
    }
  };

  const handleAddNewAddress = () => {
    setIsAddingNewAddress(true);
    setNewAddress({
      street: '',
      city: '',
      state: '',
      zipCode: '',
    });
  };

  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (newAddress) {
      setNewAddress({
        ...newAddress,
        [e.target.name]: e.target.value,
      });
    }
  };

  const handleSaveNewAddress = () => {
    if (!newAddress) return;

    if (!newAddress.street || !newAddress.city || !newAddress.state || !newAddress.zipCode) {
      toast.error('Please fill in all address fields.');
      return;
    }

    // Here you would typically make an API call to save the new address to the database
    // and then update the currentUser context with the new address.
    // For this example, we'll just simulate it.

    const newAddressWithId: Address = {
      ...newAddress,
      id: Date.now().toString(), // Generate a unique ID
      isDefault: false,
    };

    updateUser({
      ...currentUser,
      addresses: [...(currentUser.addresses || []), newAddressWithId],
    });

    setAddress(newAddressWithId);
    setIsAddingNewAddress(false);
    setNewAddress(null);

    toast.success('New address saved!');
  };

  const handleCancelNewAddress = () => {
    setIsAddingNewAddress(false);
    setNewAddress(null);
  };

  const handleCustomTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTipAmount(e.target.value);
  };

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
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Order Summary</h2>
                  {cart.map((item) => (
                    <div key={item.menuItem.id} className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.quantity}x</span>
                        <span>{item.menuItem.name}</span>
                      </div>
                      <span>{formatThaiCurrency(item.menuItem.price * item.quantity)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatThaiCurrency(cartTotal)}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-3">Table Number</h2>
                  <Input
                    type="text"
                    placeholder="Enter table number (optional)"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-3">Payment Method</h2>
                  <RadioGroup defaultValue={paymentMethod} onValueChange={setPaymentMethod} className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="payment-cash" />
                      <Label htmlFor="payment-cash">Cash on Delivery</Label>
                    </div>
                    {/* Add other payment methods here if needed */}
                  </RadioGroup>
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-3">Delivery Address</h2>
                  {currentUser && currentUser.addresses && currentUser.addresses.length > 0 ? (
                    <>
                      <RadioGroup defaultValue={address?.id} onValueChange={(value) => {
                        const selectedAddress = currentUser.addresses?.find(addr => addr.id === value) || null;
                        setAddress(selectedAddress);
                      }} className="space-y-2">
                        {currentUser.addresses.map((addr) => (
                          <div key={addr.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={addr.id} id={`address-${addr.id}`} />
                            <Label htmlFor={`address-${addr.id}`}>
                              {addr.street}, {addr.city}, {addr.state} {addr.zipCode}
                              {addr.isDefault && <Check className="inline-block h-4 w-4 text-green-500 ml-1" />}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      <Button variant="link" onClick={handleAddNewAddress}>Add New Address</Button>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">No saved addresses found.</p>
                      <Button variant="link" onClick={handleAddNewAddress}>Add New Address</Button>
                    </>
                  )}

                  {isAddingNewAddress && (
                    <div className="mt-4 space-y-2">
                      <Input
                        type="text"
                        placeholder="Street Address"
                        name="street"
                        value={newAddress?.street || ''}
                        onChange={handleAddressInputChange}
                      />
                      <Input
                        type="text"
                        placeholder="City"
                        name="city"
                        value={newAddress?.city || ''}
                        onChange={handleAddressInputChange}
                      />
                      <Input
                        type="text"
                        placeholder="State"
                        name="state"
                        value={newAddress?.state || ''}
                        onChange={handleAddressInputChange}
                      />
                      <Input
                        type="text"
                        placeholder="Zip Code"
                        name="zipCode"
                        value={newAddress?.zipCode || ''}
                        onChange={handleAddressInputChange}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" onClick={handleCancelNewAddress}>Cancel</Button>
                        <Button onClick={handleSaveNewAddress}>Save Address</Button>
                      </div>
                    </div>
                  )}
                </div>
      
      {/* Tip Selection */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Add a Tip</h2>
        <RadioGroup value={tip.toString()} onValueChange={value => setTip(Number(value))}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="0" id="tip-0" />
            <Label htmlFor="tip-0">0%</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="10" id="tip-10" />
            <Label htmlFor="tip-10">10%</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="15" id="tip-15" />
            <Label htmlFor="tip-15">15%</Label>
          </div>
          
          <div className="mt-4 flex items-center space-x-2">
            <RadioGroupItem 
              value="-1" 
              id="tip-custom"
              checked={tip === -1}
              onClick={() => tip !== -1 && setTip(-1)}
            />
            <Label htmlFor="tip-custom">Custom:</Label>
            <Input
              type="number"
              min="0"
              placeholder="Enter amount"
              className="w-24"
              value={customTipAmount}
              onChange={handleCustomTipChange}
              disabled={tip !== -1}
            />
          </div>
        </RadioGroup>
      </div>
      
                <CardFooter>
                  <Button className="w-full" onClick={handlePlaceOrder}>Place Order</Button>
                </CardFooter>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Checkout;
