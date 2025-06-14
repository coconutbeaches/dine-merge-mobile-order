import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import { crypto } from 'crypto';

interface Customer {
  id: string;
  name: string;
  email: string;
}

const AdminOrderCreator = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);
  const [open, setOpen] = useState(false);

  // Fetch all customers when the dialog opens
  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open]);

  // Filter customers when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter(
        customer => 
          customer.name?.toLowerCase().includes(query) || 
          customer.email.toLowerCase().includes(query)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name');

      if (error) {
        throw error;
      }

      const formattedCustomers = data.map(customer => ({
        id: customer.id,
        name: customer.name || 'Unnamed Customer',
        email: customer.email
      }));

      setCustomers(formattedCustomers);
      setFilteredCustomers(formattedCustomers);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast.error(`Failed to fetch customers: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrder = (customerId: string) => {
    console.log('Navigating to customer orders for:', customerId);
    // Use React Router navigation instead of window.location.href
    navigate(`/admin/customer-orders/${customerId}`);
    setOpen(false); // Close main dialog
  };

  const handleSaveGuest = async () => {
    if (!guestName.trim()) {
      toast.error('Guest name cannot be empty.');
      return;
    }
    setIsCreatingGuest(true);
    try {
      // IMPORTANT: Generate a valid UUID for guest ID.
      const guestId = crypto.randomUUID(); // <-- Fix: use UUID not nanoid
      const uniqueEmail = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@throwaway.com`;
      
      const { data: newGuest, error } = await supabase
        .from('profiles')
        .insert({
          id: guestId,
          name: guestName,
          email: uniqueEmail,
          role: 'guest',
        })
        .select('id, name, email')
        .single();

      if (error) throw error;

      if (newGuest) {
        const formattedNewGuest = {
          id: newGuest.id,
          name: newGuest.name || 'Unnamed Guest',
          email: newGuest.email,
        };
        setCustomers(prev => [formattedNewGuest, ...prev]);
        setFilteredCustomers(prev => [formattedNewGuest, ...prev]);
        setSearchQuery('');
        toast.success(`Guest "${formattedNewGuest.name}" created successfully.`);
        setIsGuestModalOpen(false);
        setGuestName('');
        // Optional: Automatically select this new guest for order creation
        // handleCreateOrder(formattedNewGuest.id);
      }
    } catch (error: any) {
      console.error('Error creating guest customer:', error);
      toast.error(`Failed to create guest: ${error.message}`);
    } finally {
      setIsCreatingGuest(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" /> New Order
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Order For Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Step 1: Select or Create Customer</h3>
            <div className="flex gap-2 mb-2">
              <Input
                type="search"
                placeholder="Search existing customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              {/* Guest Customer Dialog Trigger and Content */}
              <Dialog open={isGuestModalOpen} onOpenChange={setIsGuestModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" title="Create New Guest Customer">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xs">
                  <DialogHeader>
                    <DialogTitle>New Guest Customer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-3">
                    <Input
                      placeholder="Guest Name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      disabled={isCreatingGuest}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsGuestModalOpen(false)}
                      disabled={isCreatingGuest}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveGuest} 
                      disabled={isCreatingGuest || !guestName.trim()}
                    >
                      {isCreatingGuest ? 'Saving...' : 'Save Guest'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border rounded-md">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-4">Loading customers...</p>
            ) : filteredCustomers.length > 0 ? (
              <ul className="divide-y">
                {filteredCustomers.map((customer) => (
                  <li 
                    key={customer.id} 
                    className="py-2 px-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleCreateOrder(customer.id)}
                  >
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </li>
                ))}
              </ul>
            ) : searchQuery ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                No customers found for your search. Try a different term, or check if some customer profiles are missing names (search works best with names or full email addresses). You can also create a new guest.
              </p>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                No customers available. Create a new guest to start.
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AdminOrderCreator;
