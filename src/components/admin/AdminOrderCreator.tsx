"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

interface Customer {
  id: string;
  name: string;
  email: string;
}

const AdminOrderCreator = () => {
  const router = useRouter();
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
      // Use the same logic as the customers page to ensure consistency
      let data;
      let supabaseError;
      
      try {
        const result = await supabase
          .rpc('get_all_customers_with_total_spent_grouped', {
            p_limit: 100,
            p_offset: 0,
            p_include_archived: false // Only get non-archived customers
          });
        data = result.data;
        supabaseError = result.error;
        
        // Check if we have guest families in the RPC result
        if (data) {
          const guestFamilies = data.filter(customer => customer.customer_type === 'guest_family');
          if (guestFamilies.length === 0) {
            throw new Error('No guest families found, using fallback');
          }
        }
      } catch (rpcError) {
        console.log('New RPC function not available, using fallback method that includes guests');
        
        // Fallback: Get both auth users and guest families manually
        // 1. Get auth users from profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            email,
            created_at,
            archived,
            deleted
          `)
          .limit(50);

        if (profilesError) throw profilesError;

        // Get order totals for each profile
        const profilesWithTotals = await Promise.all(
          (profilesData || []).map(async (profile) => {
            const { data: orderData } = await supabase
              .from('orders')
              .select('total_amount, created_at')
              .eq('user_id', profile.id);

            const totalSpent = orderData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
            const lastOrderDate = orderData?.length > 0 
              ? Math.max(...orderData.map(o => new Date(o.created_at).getTime()))
              : null;

            return {
              customer_id: profile.id,
              name: profile.name || profile.email,
              customer_type: 'auth_user' as const,
              total_spent: totalSpent,
              last_order_date: lastOrderDate ? new Date(lastOrderDate).toISOString() : null,
              archived: profile.archived || false,
              deleted: profile.deleted || false,
              joined_at: profile.created_at
            };
          })
        );

        // 2. Get guest families by grouping orders by stay_id
        const { data: guestOrders, error: guestError } = await supabase
          .from('orders')
          .select('stay_id, total_amount, created_at')
          .not('guest_user_id', 'is', null)
          .not('stay_id', 'is', null);

        if (guestError) {
          console.warn('Error fetching guest orders:', guestError);
        }

        // Group guest orders by stay_id
        const guestFamilies: any[] = [];
        if (guestOrders) {
          const guestGroups = guestOrders.reduce((groups, order) => {
            const stayId = order.stay_id;
            if (!groups[stayId]) {
              groups[stayId] = [];
            }
            groups[stayId].push(order);
            return groups;
          }, {} as Record<string, typeof guestOrders>);

          Object.entries(guestGroups).forEach(([stayId, orders]) => {
            const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);
            const dates = orders.map(o => new Date(o.created_at).getTime());
            const lastOrderDate = Math.max(...dates);
            const joinedAt = Math.min(...dates);

            guestFamilies.push({
              customer_id: stayId,
              name: stayId, // Will be formatted for display
              customer_type: 'guest_family' as const,
              total_spent: totalSpent,
              last_order_date: new Date(lastOrderDate).toISOString(),
              archived: false,
              joined_at: new Date(joinedAt).toISOString()
            });
          });
        }

        // Combine auth users and guest families
        data = [...profilesWithTotals, ...guestFamilies];
        supabaseError = null;
      }

      if (supabaseError) {
        throw new Error(supabaseError.message || 'Failed to fetch customers');
      }

      if (!data) {
        setCustomers([]);
        setFilteredCustomers([]);
        return;
      }

      // Filter to exclude archived and deleted customers (same logic as customers page)
      const filteredData = data.filter(customer => {
        // Always exclude deleted customers
        if (customer.deleted) return false;
        
        // Always exclude archived customers (no toggle in AdminOrderCreator)
        if (customer.archived) return false;
        
        return true;
      });

      // Format customers for display
      const formattedCustomers = filteredData.map(customer => ({
        id: customer.customer_id,
        name: customer.name || 'Unnamed Customer',
        email: customer.customer_type === 'auth_user' ? customer.email : customer.name // Use stay_id as email for guest families
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
    router.push(`/admin/customer-orders/${customerId}`);
    setOpen(false); // Close main dialog
  };

  const handleSaveGuest = async () => {
    if (!guestName.trim()) {
      toast.error('Guest name cannot be empty.');
      return;
    }
    setIsCreatingGuest(true);
    try {
      // Create UUID for guestId using the browser's crypto API (do not import crypto)
      const guestId = crypto.randomUUID();
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
          <Button 
            variant="ghost"
            size="icon"
            className="h-10 w-10 border border-input hover:bg-accent hover:text-accent-foreground"
            aria-label="New Order"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Create Order for Customer</DialogTitle>
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
                <DialogContent className="sm:max-w-xs bg-white">
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
        
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AdminOrderCreator;
