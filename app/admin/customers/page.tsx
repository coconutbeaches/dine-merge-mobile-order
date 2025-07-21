"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CustomersList from '@/components/admin/CustomersList';
import EditCustomerDialog from '@/components/admin/EditCustomerDialog';
import { updateUserProfile, mergeCustomers, archiveGuestFamily } from '@/services/userProfileService';
import { toast } from 'sonner';
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
      // First try the new optimized function, fallback to old method
      let data;
      let supabaseError;
      
      console.log('Attempting to fetch customers using RPC...');
      try {
        const result = await supabase
          .rpc('get_all_customers_with_total_spent_grouped', {
            p_include_archived: includeArchived,
            p_limit: 100,
            p_offset: 0,
            
          });
        data = result.data;
        supabaseError = result.error;
        
        console.log('RPC function result:', {
          data: data?.length || 0,
          error: supabaseError,
          sampleData: data?.slice(0, 3)
        });
        
        // If RPC function succeeded, use its data even if no guest families
        if (data && !supabaseError) {
          const guestFamilies = data.filter(customer => customer.customer_type === 'guest_family');
          console.log('Guest families from RPC:', guestFamilies.length);
          console.log('Using optimized RPC function result');
        } else if (supabaseError) {
          console.error('RPC function returned an error, falling back:', supabaseError);
          throw supabaseError; // Explicitly throw to trigger fallback
        }
      } catch (rpcError: any) {
        console.log('New RPC function not available or failed, using fallback method that includes guests');
        console.log('RPC Error details:', rpcError);
        
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
          .select('stay_id, total_amount, created_at, table_number, guest_first_name')
          .not('guest_user_id', 'is', null)
          .not('stay_id', 'is', null);

        if (guestError) {
          console.warn('Error fetching guest orders:', guestError);
        } else {
          console.log('Guest orders fetched successfully:', guestOrders?.length || 0, 'orders');
          console.log('Sample guest orders:', guestOrders?.slice(0, 3));
        }

        // Group guest orders by stay_id
        const guestFamilies: GroupedCustomer[] = [];
        if (guestOrders) {
          const guestGroups = guestOrders.reduce((groups, order) => {
            const stayId = order.stay_id;
            if (!groups[stayId]) {
              groups[stayId] = [];
            }
            groups[stayId].push(order);
            return groups;
          }, {} as Record<string, typeof guestOrders>);

          // Get archived guest families
          const { data: archivedGuestFamilies } = await supabase
            .from('guest_family_archives')
            .select('stay_id');
          
          const archivedStayIds = new Set(archivedGuestFamilies?.map(g => g.stay_id) || []);

          Object.entries(guestGroups).forEach(([stayId, orders]) => {
            const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);
            const dates = orders.map(o => new Date(o.created_at).getTime());
            const lastOrderDate = Math.max(...dates);
            const joinedAt = Math.min(...dates);
            
            // Get the table number from the first order (all orders for the same stay_id should have the same table_number)
            const tableNumber = orders[0]?.table_number;
            
            // Get the guest first name from the first order that has one
            const guestFirstName = orders.find(order => order.guest_first_name)?.guest_first_name;

            guestFamilies.push({
              customer_id: stayId,
              name: stayId, // Will be formatted by formatStayId
              customer_type: 'guest_family' as const,
              total_spent: totalSpent,
              last_order_date: new Date(lastOrderDate).toISOString(),
              archived: archivedStayIds.has(stayId),
              joined_at: new Date(joinedAt).toISOString(),
              table_number: tableNumber, // Add table number for formatting
              guest_first_name: guestFirstName // Add guest first name for walk-ins
            });
          });
        }

        // Combine auth users and guest families
        console.log('Fallback results:', {
          profilesWithTotals: profilesWithTotals.length,
          guestFamilies: guestFamilies.length,
          sampleGuestFamilies: guestFamilies.slice(0, 3)
        });
        data = [...profilesWithTotals, ...guestFamilies];
        supabaseError = null;
      }

      if (supabaseError) {
        console.error('Supabase error:', supabaseError);
        throw new Error(supabaseError.message || 'Failed to fetch customers');
      }

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
  
  useEffect(() => {
    fetchCustomers();
  }, []); // Fetch on initial load

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