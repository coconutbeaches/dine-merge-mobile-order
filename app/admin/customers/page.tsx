"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CustomersList from '@/components/admin/CustomersList';
import EditCustomerDialog from '@/components/admin/EditCustomerDialog';
import { updateUserProfile, mergeCustomers, archiveGuestFamily } from '@/services/userProfileService';
import { toast } from 'sonner';
import { getCustomersChannel } from '@/services/customersChannelSingleton';
import MergeCustomersDialog from '@/components/admin/MergeCustomersDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Trash2, Merge, Archive, Edit, Users } from 'lucide-react';

// Extended Customer interface to include archived and deleted fields
// Query now selects: 'id, name, email, archived, deleted' from profiles
// Filters deleted customers in JS and only keeps id, name, email for display
interface GroupedCustomer {
  customer_id: string; // UUID for profiles, TEXT stay_id for guests
  name: string;
  customer_type: 'auth_user' | 'guest_family';
  total_spent: number;
  last_order_date: string | null;
  archived: boolean;
  deleted?: boolean; // Optional field for soft deletion
  joined_at: string;
}

export default function CustomersDashboardPage() {
  const [customers, setCustomers] = useState<GroupedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<keyof GroupedCustomer>('last_order_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [showWalkins, setShowWalkins] = useState(false);
  
  // Helper function to determine if a customer is a walkin
  const isWalkinCustomer = (customer: GroupedCustomer): boolean => {
    if (customer.customer_type === 'guest_family') {
      return customer.customer_id?.toLowerCase().includes('walkin') || false;
    }
    return false;
  };
  
  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching customers with total_spent calculations...');
      
      // Try to use the RPC function first
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_customers_with_total_spent', { include_archived: includeArchived });
        
        if (!rpcError && rpcData) {
          // Transform RPC data to GroupedCustomer format
          const customersWithTotals = rpcData.map((customer: any) => ({
            customer_id: customer.id,
            name: customer.name || customer.email || 'Unnamed Customer',
            customer_type: 'auth_user' as const,
            total_spent: Number(customer.total_spent) || 0,
            last_order_date: customer.last_order_date,
            archived: customer.archived || false,
            joined_at: customer.created_at
          }));
          
          setCustomers(customersWithTotals as GroupedCustomer[]);
          console.log('Successfully fetched', customersWithTotals.length, 'customers with total_spent from RPC');
          return;
        }
      } catch (rpcErr) {
        console.log('RPC function not available, falling back to manual calculation');
      }
      
      // Fallback: Get auth users from profiles and calculate total_spent manually
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
        .eq('deleted', false)
        .limit(100);

      if (profilesError) throw profilesError;

      // Get order totals for each customer
      const profileIds = profilesData?.map(p => p.id) || [];
      const { data: orderTotals, error: orderError } = await supabase
        .from('orders')
        .select('user_id, total_amount, created_at')
        .in('user_id', profileIds);
      
      if (orderError) {
        console.warn('Could not fetch order totals:', orderError);
      }
      
      // Calculate totals and last order dates
      const customerTotals = new Map();
      const lastOrderDates = new Map();
      
      if (orderTotals) {
        orderTotals.forEach(order => {
          const userId = order.user_id;
          const amount = Number(order.total_amount) || 0;
          const orderDate = new Date(order.created_at);
          
          customerTotals.set(userId, (customerTotals.get(userId) || 0) + amount);
          
          const currentLastDate = lastOrderDates.get(userId);
          if (!currentLastDate || orderDate > currentLastDate) {
            lastOrderDates.set(userId, orderDate);
          }
        });
      }

      // Transform profiles to GroupedCustomer format with calculated totals
      const profilesWithBasicData = (profilesData || []).map(profile => ({
        customer_id: profile.id,
        name: profile.name || profile.email || 'Unnamed Customer',
        customer_type: 'auth_user' as const,
        total_spent: customerTotals.get(profile.id) || 0,
        last_order_date: lastOrderDates.get(profile.id)?.toISOString() || null,
        archived: profile.archived || false,
        deleted: profile.deleted || false,
        joined_at: profile.created_at
      }));

      console.log('Basic customer fetch results:', {
        profilesWithBasicData: profilesWithBasicData.length
      });
      const data = profilesWithBasicData;

      if (!data) {
        setCustomers([]);
        return;
      }

      // Filter based on includeArchived state and exclude deleted customers
      const filteredData = data.filter(customer => {
        // Always exclude deleted customers
        if (customer.deleted) return false;
        
        // Filter archived customers based on includeArchived state
        return includeArchived || !customer.archived;
      });

      // Format customers to only include id, name, email for display (as per task requirements)
      const formattedCustomers = filteredData.map(customer => ({
        ...customer,
        // Keep original data but ensure we have the required fields
        id: customer.customer_id,
        name: customer.name,
        email: customer.customer_type === 'auth_user' ? customer.email : null
      }));

      setCustomers(formattedCustomers as GroupedCustomer[]);
      console.log('Successfully fetched', formattedCustomers.length, 'customers (excluding deleted)');
    } catch (err: any) {
      setError(err);
      toast.error(`Failed to fetch customers: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };
  
  const selectAllCustomers = () => {
    setSelectedCustomers(customers.map(c => c.customer_id));
  };
  
  const clearSelection = () => {
    setSelectedCustomers([]);
  };
  
  const deleteSelectedCustomers = async () => {
    if (selectedCustomers.length === 0) return;
    
    try {
      for (const customerId of selectedCustomers) {
        const customerToDelete = customers.find(c => c.customer_id === customerId);
        if (!customerToDelete) continue;

        if (customerToDelete.customer_type === 'auth_user') {
          const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', customerId);
          if (error) throw error;
        } else if (customerToDelete.customer_type === 'guest_family') {
          const { error } = await supabase
            .from('guest_users')
            .delete()
            .eq('stay_id', customerId); // customer_id is stay_id for guest_family
          if (error) throw error;
        }
      }

      setCustomers(prev => prev.filter(customer => !selectedCustomers.includes(customer.customer_id)));
      setSelectedCustomers([]);
      toast.success(`Deleted ${selectedCustomers.length} customer(s)`);
    } catch (error: any) {
      toast.error(`Failed to delete customers: ${error.message}`);
    }
  };
  
useEffect(() = 3e {
    fetchCustomers();
    
    const customersChannel = getCustomersChannel();
    const unsubscribe = customersChannel.subscribe((payload) => {
      const { user_id, total_amount, created_at } = payload.new;
      console.log('[CustomersPage] Order INSERT received:', { user_id, total_amount, created_at });
      
      setCustomers((prevCustomers) => prevCustomers.map(customer => {
        if (customer.customer_id === user_id) {
          const updatedSpent = Number(customer.total_spent) + Number(total_amount);
          const orderDate = created_at;
          
          // Update both total_spent and last_order_date
          const updatedCustomer = {
            ...customer,
            total_spent: updatedSpent,
            last_order_date: orderDate || customer.last_order_date
          };
          
          console.log('[CustomersPage] Updated customer:', updatedCustomer.name, 'new total:', updatedSpent);
          return updatedCustomer;
        }
        return customer;
      }));
    });
    
    return () = 3e unsubscribe();
  }, []); // Fetch on initial load and set up realtime

  useEffect(() => {
    fetchCustomers(); // Refetch when includeArchived changes
  }, [includeArchived]);

  const handleSort = (key: keyof GroupedCustomer) => {
    if (sortKey === key) {
      setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<GroupedCustomer | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);
  
  const filteredCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    
    let filtered = customers;
    
    // Apply search filter
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(customer => {
        const name = (customer?.name || "").toLowerCase();
        const customerId = (customer?.customer_id || "").toLowerCase();
        return name.includes(s) || customerId.includes(s); // Search by name or customer_id
      });
    }
    
    // Apply walkin filter
    if (!showWalkins) {
      filtered = filtered.filter(customer => !isWalkinCustomer(customer));
    }
    
    const sorted = [...filtered].sort((a, b) => {
      let valA: any, valB: any; // Use any for comparison due to mixed types
      
      switch (sortKey) {
        case 'name':
          valA = a.name || '';
          valB = b.name || '';
          break;
        case 'total_spent':
          valA = a.total_spent || 0;
          valB = b.total_spent || 0;
          break;
        case 'last_order_date':
          valA = a.last_order_date ? new Date(a.last_order_date).getTime() : 0;
          valB = b.last_order_date ? new Date(b.last_order_date).getTime() : 0;
          break;
        case 'joined_at':
          valA = new Date(a.joined_at).getTime();
          valB = new Date(b.joined_at).getTime();
          break;
        case 'customer_type':
          valA = a.customer_type || '';
          valB = b.customer_type || '';
          break;
        default:
          return 0;
      }
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
    });
    
    return sorted;
  }, [customers, search, sortKey, sortDirection, showWalkins, isWalkinCustomer]);

  const stats = useMemo(() => {
    if (!customers || !Array.isArray(customers)) {
      return { totalCustomers: 0, authUsers: 0, guestFamilies: 0, totalSpent: 0 };
    }
    return {
      totalCustomers: customers.length,
      authUsers: customers.filter(c => c?.customer_type === 'auth_user').length,
      guestFamilies: customers.filter(c => c?.customer_type === 'guest_family').length,
      totalSpent: customers.reduce((sum, c) => sum + (c?.total_spent || 0), 0)
    };
  }, [customers]);

  const customersToMerge = useMemo(() => {
    if (!customers || !Array.isArray(customers) || selectedCustomers.length !== 2) return [];
    return customers.filter(c => selectedCustomers.includes(c?.customer_id));
  }, [customers, selectedCustomers]);

  const handleMergeClick = () => {
    if (customersToMerge.length === 2) {
      setIsMergeDialogOpen(true);
    }
  };

  const handleConfirmMerge = async (targetId: string, sourceId: string) => {
    try {
      await mergeCustomers(sourceId, targetId); // This function needs to be updated to handle guest_user_id merges
      toast.success('Customers merged successfully!');
      fetchCustomers();
      setIsMergeDialogOpen(false);
    } catch (error: any) {
      console.error('handleConfirmMerge error:', error);
      toast.error(`Failed to merge customers: ${error.message}`);
    }
  };

  const handleEditCustomer = (customer: GroupedCustomer) => {
    if (customer.customer_type === 'guest_family') {
      toast.info('Guest families cannot be edited directly from here.');
      return;
    }
    setEditingCustomer(customer);
  };

  const handleCloseDialog = () => {
    setEditingCustomer(null);
  };

  const handleSaveChanges = async (name: string, phone: string) => {
    if (!editingCustomer || editingCustomer.customer_type === 'guest_family') {
      toast.error("Cannot save changes for guest families from here.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Name cannot be empty.");
      return;
    }
    if (trimmedName.length > 100) {
      toast.error("Name cannot be longer than 100 characters.");
      return;
    }

    const trimmedPhone = phone.trim();
    const phoneRegex = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
    if (trimmedPhone && !phoneRegex.test(trimmedPhone)) {
      toast.error("Please enter a valid phone number (e.g., 0812345678).");
      return;
    }
     if (trimmedPhone.replace(/-/g, '').length > 10) {
        toast.error("Phone number seems too long.");
        return;
    }

    try {
      await updateUserProfile({
        id: editingCustomer.customer_id, // Use customer_id
        name: trimmedName,
        phone: trimmedPhone,
      });
      toast.success('Customer updated successfully');
      fetchCustomers(); // Refetch all customers
      handleCloseDialog();
    } catch (error: any) {
      console.error('handleSaveChanges error:', error);
      toast.error(`Failed to update customer: ${error.message}`);
    }
  };

  const handleArchiveCustomer = async (customer: GroupedCustomer, isArchived: boolean) => {
    try {
      if (customer.customer_type === 'guest_family') {
        const { error } = await archiveGuestFamily(customer.customer_id, isArchived);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profiles')
          .update({ archived: isArchived })
          .eq('id', customer.customer_id);
        if (error) throw error;
      }

      // Update local customers state to flip archived
      setCustomers(prev => prev.map(c => 
        c.customer_id === customer.customer_id 
          ? { ...c, archived: isArchived }
          : c
      ));

      toast.success(isArchived ? 'Customer archived successfully!' : 'Customer unarchived successfully!');
    } catch (error: any) {
      console.error('Error archiving customer:', error);
      toast.error(`Failed to archive customer: ${error.message}`);
    }
  };

  return (
    <Layout title="Customers" showBackButton={false}>
      <div className="container mx-auto p-4 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error.message}</span>
            <button 
              onClick={fetchCustomers}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}
        
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">All registered customers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Auth Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.authUsers}</div>
              <p className="text-xs text-muted-foreground">Registered via email/password</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Guest Families</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.guestFamilies}</div>
              <p className="text-xs text-muted-foreground">Groups of guests by stay ID</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search customers..."
              className="w-full pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={includeArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setIncludeArchived(!includeArchived)}
              className={includeArchived ? "bg-black text-white hover:bg-gray-800" : ""}
            >
              <Archive className="mr-2 h-4 w-4" />
              {includeArchived ? "Hide Archived" : "Show Archived"}
            </Button>
            <Button 
              variant={showWalkins ? "default" : "outline"}
              size="sm"
              onClick={() => setShowWalkins(!showWalkins)}
              className={showWalkins ? "bg-black text-white hover:bg-gray-800" : ""}
            >
              <Users className="mr-2 h-4 w-4" />
              {showWalkins ? "Hide Walkins" : "Show Walkins"}
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchCustomers} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh</span>
            </Button>
            {selectedCustomers.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={deleteSelectedCustomers}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectedCustomers.forEach(id => {
                  const customer = customers.find(c => c.customer_id === id);
                  if (customer) handleArchiveCustomer(customer, true);
                })}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
                {selectedCustomers.length === 1 && (
                  <Button variant="outline" size="sm" onClick={() => {
                    const customer = customers.find(c => c.customer_id === selectedCustomers[0]);
                    if (customer) handleEditCustomer(customer);
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
                {selectedCustomers.length === 2 && (
                  <Button variant="outline" size="sm" onClick={handleMergeClick}>
                    <Merge className="mr-2 h-4 w-4" />
                    Merge
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading customers...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-600">
                <p>Error: {error.message}</p>
                <Button onClick={fetchCustomers} className="mt-2">Retry</Button>
              </div>
            ) : customers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No customers found</div>
            ) : (
              <CustomersList
                customers={filteredCustomers}
                selectedCustomers={selectedCustomers}
                toggleSelectCustomer={toggleSelectCustomer}
                selectAllCustomers={() => selectAllCustomers()}
                clearSelection={clearSelection}
                onEditCustomer={handleEditCustomer}
                sortKey={sortKey}
                sortDirection={sortDirection}
                handleSort={handleSort}
                onArchiveCustomer={handleArchiveCustomer}
              />
            )}
          </CardContent>
        </Card>

        <EditCustomerDialog
          customer={editingCustomer}
          isOpen={!!editingCustomer}
          onClose={handleCloseDialog}
          onSave={handleSaveChanges}
        />

        <MergeCustomersDialog
          isOpen={isMergeDialogOpen}
          onClose={() => setIsMergeDialogOpen(false)}
          onMerge={handleConfirmMerge}
          customers={customersToMerge}
        />
      </div>
    </Layout>
  );
}