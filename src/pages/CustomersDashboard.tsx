import React, { useState, useMemo, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomersDashboard } from '@/hooks/useCustomersDashboard';
import CustomersList from '@/components/admin/CustomersList';
import { Profile } from '@/types/supabaseTypes';
import EditCustomerDialog from '@/components/admin/EditCustomerDialog';
import { updateUserProfile, mergeCustomers } from '@/services/userProfileService';
import { toast } from 'sonner';
import MergeCustomersDialog from '@/components/admin/MergeCustomersDialog';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Trash2, Merge, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const CustomersDashboard = () => {
  const queryClient = useQueryClient();
  const {
    customers, // This is the flattened list from useInfiniteQuery
    selectedCustomers,
    isLoading, // Initial loading state
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage, // Loading state for subsequent pages
    refetchCustomers,
    deleteSelectedCustomers,
    toggleSelectCustomer,
    selectAllCustomers,
    setSelectedCustomers, // Added from updated useCustomersDashboard
    clearSelection,
  } = useCustomersDashboard();

  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Profile | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);
  
  const filteredCustomers = useMemo(() => {
    // customers is already the full list fetched so far.
    if (!search.trim()) return customers;
    const s = search.trim().toLowerCase();
    return customers.filter(customer => {
      const name = (customer.name || "").toLowerCase();
      const email = (customer.email || "").toLowerCase();
      const phone = (customer.phone || "").toLowerCase();
      return name.includes(s) || email.includes(s) || phone.includes(s);
    });
  }, [customers, search]);

  // Stats should reflect all customers fetched so far.
  // For total customers in DB, a separate count query might be needed if not showing all.
  const stats = useMemo(() => ({
    totalCustomers: customers.length, // This is count of fetched customers
    activeCustomers: customers.filter(c => c.customer_type === 'hotel_guest').length,
    totalSpent: customers.reduce((sum, c) => sum + (c.total_spent || 0), 0)
  }), [customers]);

  const customersToMerge = useMemo(() => {
    if (selectedCustomers.length !== 2) return [];
    return customers.filter(c => selectedCustomers.includes(c.id));
  }, [customers, selectedCustomers]);

  const handleMergeClick = () => {
    if (customersToMerge.length === 2) {
      setIsMergeDialogOpen(true);
    }
  };

  const handleConfirmMerge = async (targetId: string, sourceId: string) => {
    try {
      await mergeCustomers(sourceId, targetId);
      toast.success('Customers merged successfully!');
      refetchCustomers(); // Refetch after merge
      setIsMergeDialogOpen(false);
      setSelectedCustomers([]); // Clear selection
    } catch (error: any) {
      console.error('handleConfirmMerge error:', error);
      toast.error(`Failed to merge customers: ${error.message}`);
    }
  };

  const handleEditCustomer = (customer: Profile) => {
    setEditingCustomer(customer);
  };

  const handleCloseDialog = () => {
    setEditingCustomer(null);
  };

  const handleSaveChanges = async (name: string, phone: string) => {
    if (!editingCustomer) return;

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
        id: editingCustomer.id,
        name: trimmedName,
        phone: trimmedPhone,
      });
      toast.success('Customer updated successfully');
      refetchCustomers(); // Refetch after save
      handleCloseDialog();
    } catch (error: any) {
      console.error('handleSaveChanges error:', error);
      toast.error(`Failed to update customer: ${error.message}`);
    }
  };

  async function toggleCustomerType(id: string, isGuestNow: boolean) {
    const newType = isGuestNow ? null : 'hotel_guest';
    console.log('🔄 Trying to update customer_type for', id, '→', newType);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ customer_type: newType })
      .eq('id', id)
      .select();

    if (updateError) {
      console.error('❌ Supabase update error:', updateError);
      toast.error(`Failed to update customer type: ${updateError.message}`);
    } else {
      console.log('✅ Supabase update success');
      toast.success('Customer type updated.');
      // Invalidate the query to refetch and update UI
      queryClient.invalidateQueries(['customers']);
      // Or call refetchCustomers();

      setRecentlyUpdatedId(id);
      setTimeout(() => setRecentlyUpdatedId(null), 1000);
    }
  }

  const handleUpdateCustomer = useCallback(async (customerId: string, updates: Partial<Profile>) => {
    try {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', customerId)
        .select()
        .single();

      if (updateError) throw updateError;

      toast.success('Customer details updated.');
      queryClient.invalidateQueries(['customers']); // Invalidate to refetch
      return { success: true, data: updatedProfile };
    } catch (err: any) {
      console.error('Error updating customer:', err);
      toast.error(`Failed to update customer: ${err.message}`);
      return { success: false, error: err };
    }
  }, [queryClient]);

  return (
    <Layout title="Customers" showBackButton={false}>
      <div className="container mx-auto p-4 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error.message}</span>
            <button 
              onClick={() => refetchCustomers()}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}
        
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Displayed Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">Customers currently shown</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Guests (Displayed)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCustomers}</div>
              <p className="text-xs text-muted-foreground">Hotel guests among displayed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue (Displayed)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">฿{stats.totalSpent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">From displayed customers</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search customers..."
              className="w-full pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetchCustomers()} disabled={isLoading || isFetchingNextPage}>
              <RefreshCw className={`h-4 w-4 ${isLoading || isFetchingNextPage ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh</span>
            </Button>
            {selectedCustomers.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => deleteSelectedCustomers()}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
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
            {isLoading && customers.length === 0 ? ( // Show initial loading only if no customers yet
              <div className="p-6 text-center text-muted-foreground flex items-center justify-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading customers...
              </div>
            ) : (
              <CustomersList
                customers={filteredCustomers}
                selectedCustomers={selectedCustomers}
                toggleSelectCustomer={toggleSelectCustomer}
                selectAllCustomers={() => selectAllCustomers(filteredCustomers.map(c => c.id))}
                clearSelection={clearSelection}
                onEditCustomer={handleEditCustomer}
                onUpdateCustomer={handleUpdateCustomer} // For profile picture
                toggleCustomerType={toggleCustomerType} // For guest status
                recentlyUpdatedId={recentlyUpdatedId}
                // Pagination props
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
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
};

export default CustomersDashboard;
