import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatThaiCurrency } from '@/lib/utils';
import { 
  OrderStatus, 
  PaymentStatus, 
  FulfillmentStatus, 
  SupabaseOrderStatus,
  mapOrderStatusToSupabase 
} from '@/types/supabaseTypes';
import { Json } from '@/integrations/supabase/types';

// Interface for profile data
interface Profile {
  id: string;
  name: string | null;
  email: string;
}

// Interface for menu item data
interface MenuItem {
  id: string;
  name: string;
  price: number;
}

// Interface for custom item in order
interface CustomItem {
  name: string;
  price: number;
}

// Interface for order item (can be menu item or custom item)
interface OrderItem {
  menuItemId?: string; // Optional for custom items
  name: string;
  quantity: number;
  unitPrice: number;
  isCustomItem: boolean;
}

const AdminOrderCreator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Profile | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [selectedMenuItem, setSelectedMenuItem] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [tableNumber, setTableNumber] = useState('Take Away');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch customers when search term changes
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setCustomers([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        console.log(`Searching for customers with term: ${searchTerm}`);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching customers:', error);
          throw error;
        }
        console.log(`Found ${data?.length || 0} matching customers`, data);
        setCustomers(data || []);
      } catch (error: any) {
        console.error('Error fetching customers:', error);
        toast({
          title: "Error",
          description: `Failed to fetch customers: ${error.message}`,
          variant: "destructive"
        });
        setCustomers([]);
      } finally {
        setIsSearching(false);
      }
    };

    if (searchTerm.length >= 2) {
      fetchCustomers();
    }
  }, [searchTerm, toast]);

  // Fetch menu items on component mount
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price')
          .order('name', { ascending: true });

        if (error) throw error;
        setMenuItems(data || []);
      } catch (error: any) {
        console.error('Error fetching menu items:', error);
      }
    };

    fetchMenuItems();
  }, []);

  const handleAddMenuItem = () => {
    if (selectedMenuItem) {
      const menuItem = menuItems.find(item => item.id === selectedMenuItem);
      if (menuItem) {
        // Check if the item already exists in the order
        const existingItemIndex = orderItems.findIndex(
          item => item.menuItemId === menuItem.id && !item.isCustomItem
        );

        if (existingItemIndex !== -1) {
          // Update quantity for existing item
          const updatedItems = [...orderItems];
          updatedItems[existingItemIndex].quantity += quantity;
          setOrderItems(updatedItems);
        } else {
          // Add new item
          setOrderItems([
            ...orderItems,
            {
              menuItemId: menuItem.id,
              name: menuItem.name,
              unitPrice: menuItem.price,
              quantity: quantity,
              isCustomItem: false
            }
          ]);
        }

        // Reset selections
        setSelectedMenuItem(null);
        setQuantity(1);
      }
    }
  };

  const handleAddCustomItem = () => {
    if (customItemName && customItemPrice) {
      const price = parseFloat(customItemPrice);
      if (isNaN(price)) {
        toast({
          title: "Invalid Price",
          description: "Please enter a valid price for the custom item",
          variant: "destructive"
        });
        return;
      }

      setOrderItems([
        ...orderItems,
        {
          name: customItemName,
          unitPrice: price,
          quantity: 1,
          isCustomItem: true
        }
      ]);

      // Reset custom item fields
      setCustomItemName('');
      setCustomItemPrice('');
    } else {
      toast({
        title: "Missing Information",
        description: "Please enter both name and price for the custom item",
        variant: "destructive"
      });
    }
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(updatedItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      toast({
        title: "No Customer Selected",
        description: "Please select a customer for this order",
        variant: "destructive"
      });
      return;
    }

    if (orderItems.length === 0) {
      toast({
        title: "Empty Order",
        description: "Please add at least one item to the order",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Convert the order items to a format compatible with Json type
      const orderItemsJson = orderItems as unknown as Json;

      // Use the proper Supabase order status
      const supabaseStatus = 'pending' as SupabaseOrderStatus;

      const orderPayload = {
        user_id: selectedCustomer.id,
        customer_name: selectedCustomer.name || selectedCustomer.email,
        order_items: orderItemsJson,
        total_amount: calculateTotal(),
        order_status: supabaseStatus,
        payment_status: 'unpaid' as PaymentStatus,
        fulfillment_status: 'unfulfilled' as FulfillmentStatus,
        table_number: tableNumber
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select();

      if (error) throw error;

      toast({
        title: "Order Created",
        description: `Order for ${selectedCustomer.name || selectedCustomer.email} created successfully`,
      });

      // Close modal and reset state
      setIsOpen(false);
      setSelectedCustomer(null);
      setOrderItems([]);
      setSearchTerm('');
      setTableNumber('Take Away');

      // Navigate to orders dashboard
      navigate('/orders-dashboard');
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: `Failed to create order: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectCustomer = (customer: Profile) => {
    console.log("Selected customer:", customer);
    setSelectedCustomer(customer);
    setSearchTerm('');
    setCustomers([]);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Order For Customer
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Order For Customer</DialogTitle>
          </DialogHeader>

          {/* Step 1: Customer Selection */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Step 1: Select Customer</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedCustomer ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search customers by name or email (min 2 characters)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    
                    {isSearching && (
                      <div className="text-center py-2 text-sm text-muted-foreground">
                        Searching for customers...
                      </div>
                    )}
                    
                    {customers.length > 0 && (
                      <div className="border rounded-md max-h-[200px] overflow-y-auto">
                        {customers.map(customer => (
                          <div 
                            key={customer.id}
                            className="p-2 cursor-pointer hover:bg-muted flex justify-between items-center border-b last:border-b-0"
                            onClick={() => selectCustomer(customer)}
                          >
                            <div>
                              <p className="font-medium">{customer.name || 'No Name'}</p>
                              <p className="text-sm text-muted-foreground">{customer.email}</p>
                            </div>
                            <Button variant="ghost" size="sm">Select</Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchTerm.length >= 2 && !isSearching && customers.length === 0 && (
                      <p className="text-sm text-muted-foreground">No customers found. Try a different search term.</p>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{selectedCustomer.name || 'No Name'}</p>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
                      Change Customer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Add Items */}
            {selectedCustomer && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Step 2: Add Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Menu Item Selection */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Select from Menu</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select value={selectedMenuItem || ""} onValueChange={setSelectedMenuItem}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select menu item" />
                          </SelectTrigger>
                          <SelectContent>
                            {menuItems.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} - {formatThaiCurrency(item.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                          <Label htmlFor="quantity">Qty:</Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        </div>

                        <Button onClick={handleAddMenuItem} disabled={!selectedMenuItem}>
                          Add Item
                        </Button>
                      </div>
                    </div>

                    {/* Custom Item Input */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Add Custom Item</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="Item name"
                          value={customItemName}
                          onChange={(e) => setCustomItemName(e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Price"
                          type="number"
                          value={customItemPrice}
                          onChange={(e) => setCustomItemPrice(e.target.value)}
                          className="w-32"
                        />
                        <Button onClick={handleAddCustomItem}>Add Custom</Button>
                      </div>
                    </div>

                    {/* Table Number Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="tableNumber">Table Number</Label>
                      <Select 
                        value={tableNumber} 
                        onValueChange={setTableNumber}
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
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
                    </div>

                    {/* Order Items List */}
                    {orderItems.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Order Items</p>
                        <div className="border rounded-md overflow-hidden">
                          {orderItems.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border-b last:border-b-0">
                              <div className="flex-1">
                                <p className="font-medium">
                                  {item.quantity} × {item.name}
                                  {item.isCustomItem && <span className="ml-1 text-xs text-muted-foreground">(custom)</span>}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatThaiCurrency(item.unitPrice)} each
                                </p>
                              </div>
                              <p className="px-2 font-medium">
                                {formatThaiCurrency(item.unitPrice * item.quantity)}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex justify-between items-center font-medium">
                          <p>Total</p>
                          <p>{formatThaiCurrency(calculateTotal())}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitOrder} disabled={!selectedCustomer || orderItems.length === 0 || isLoading}>
              {isLoading ? "Creating..." : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminOrderCreator;
