
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  email: string;
}

const AdminOrderCreator = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    // For now, just redirect to customer orders page
    // In a real implementation, you'd create a new order for this customer
    window.location.href = `/admin/customer-orders/${customerId}`;
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" /> New Order For Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Order For Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Step 1: Select Customer</h3>
            <div className="relative">
              <Input
                type="search"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-4">Loading customers...</p>
            ) : filteredCustomers.length > 0 ? (
              <ul className="divide-y">
                {filteredCustomers.map((customer) => (
                  <li 
                    key={customer.id} 
                    className="py-2 px-1 hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleCreateOrder(customer.id)}
                  >
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </li>
                ))}
              </ul>
            ) : searchQuery ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                No customers found. Try a different search term.
              </p>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                No customers available in the system.
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminOrderCreator;
