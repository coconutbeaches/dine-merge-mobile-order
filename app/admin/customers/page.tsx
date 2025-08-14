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

interface GroupedCustomer {
  customer_id: string;
  name: string;
  customer_type: 'auth_user' | 'guest_family';
  total_spent: number;
  last_order_date: string | null;
  archived: boolean;
  deleted?: boolean;
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
  
  const isWalkinCustomer = (customer: GroupedCustomer): boolean => {
    if (customer.customer_type === 'guest_family') {
      return customer.customer_id?.toLowerCase().includes('walkin') || false;
    }
    return false;
  };
  
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching customers with optimized RPC call...');
      
      const { data, error: rpcError } = await supabase
        .rpc('get_all_customers_with_total_spent_grouped', {
          p_include_archived: includeArchived,
          p_limit: 1000, // Set a high limit for now, pagination can be added later
          p_offset: 0
        });

      if (rpcError) {
        throw new Error(`Failed to fetch customers from database: ${rpcError.message}`);
      }
      
      if (data) {
        const transformedCustomers = data.map((customer: any) => ({
          customer_id: customer.customer_id,
          name: customer.name || customer.email || 'Unnamed Customer',
          customer_type: customer.customer_type as 'auth_user' | 'guest_family',
          total_spent: Number(customer.total_spent) || 0,
          last_order_date: customer.last_order_date,
          archived: customer.archived || false,
          joined_at: customer.joined_at
        }));

        setCustomers(transformedCustomers);
        console.log('Successfully fetched', transformedCustomers.length, 'customers with total_spent from RPC');
      } else {
        setCustomers([]);
      }

    } catch (err: any) {
      setError(err);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [includeArchived]);
  
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
    
    const customersToDelete = customers.filter(c => selectedCustomers.includes(c.customer_id));
    const authUserIds = customersToDelete
      .filter(c => c.customer_type === 'auth_user')
      .map(c => c.customer_id);
    const guestFamilyIds = customersToDelete
      .filter(c => c.customer_type === 'guest_family')
      .map(c => c.customer_id);
    
    try {
      // Batch delete auth users
      if (authUserIds.length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .in('id', authUserIds);
        if (profileError) throw profileError;
      }

      // Batch delete guest families  
      if (guestFamilyIds.length > 0) {
        const { error: guestError } = await supabase
          .from('guest_users')
          .delete()
          .in('stay_id', guestFamilyIds);
        if (guestError) throw guestError;
      }

      setCustomers(prev => prev.filter(customer => !selectedCustomers.includes(customer.customer_id)));
      setSelectedCustomers([]);
      toast.success(`Deleted ${selectedCustomers.length} customer(s)`);
    } catch (error: any) {
      console.error('Error bulk deleting customers:', error);
      toast.error(`Failed to delete customers: ${error.message}`);
      // Refresh data on error to ensure consistency
      fetchCustomers();
    }
  };
  
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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
  
  const filteredCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    
    let filtered = customers;
    
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(customer => {
        const name = (customer?.name || "").toLowerCase();
        const customerId = (customer?.customer_id || "").toLowerCase();
        return name.includes(s) || customerId.includes(s);
      });
    }
    
    if (!showWalkins) {
      filtered = filtered.filter(customer => !isWalkinCustomer(customer));
    }
    
    const sorted = [...filtered].sort((a, b) => {
      let valA: any, valB: any;
      
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
      await mergeCustomers(sourceId, targetId);
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
        id: editingCustomer.customer_id,
        name: trimmedName,
        phone: trimmedPhone,
      });
      toast.success('Customer updated successfully');
      fetchCustomers();
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

  const handleBulkArchiveCustomers = async (customerIds: string[], isArchived: boolean) => {
    if (customerIds.length === 0) return;
    
    const customersToArchive = customers.filter(c => customerIds.includes(c.customer_id));
    const authUserIds = customersToArchive
      .filter(c => c.customer_type === 'auth_user')
      .map(c => c.customer_id);
    const guestFamilyIds = customersToArchive
      .filter(c => c.customer_type === 'guest_family')
      .map(c => c.customer_id);

    try {
      // Batch archive auth users
      if (authUserIds.length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ archived: isArchived })
          .in('id', authUserIds);
        if (profileError) throw profileError;
      }

      // Batch archive guest families
      if (guestFamilyIds.length > 0) {
        if (isArchived) {
          // Insert multiple archive records
          const archiveRecords = guestFamilyIds.map(id => ({ stay_id: id }));
          const { error: archiveError } = await supabase
            .from('guest_family_archives')
            .upsert(archiveRecords);
          if (archiveError) throw archiveError;
        } else {
          // Remove multiple archive records
          const { error: unarchiveError } = await supabase
            .from('guest_family_archives')
            .delete()
            .in('stay_id', guestFamilyIds);
          if (unarchiveError) throw unarchiveError;
        }
      }

      // Update local state in batch
      setCustomers(prev => prev.map(c => 
        customerIds.includes(c.customer_id)
          ? { ...c, archived: isArchived }
          : c
      ));

      toast.success(`${customerIds.length} customer(s) ${isArchived ? 'archived' : 'unarchived'} successfully!`);
    } catch (error: any) {
      console.error('Error bulk archiving customers:', error);
      toast.error(`Failed to ${isArchived ? 'archive' : 'unarchive'} customers: ${error.message}`);
      // Refresh data on error to ensure consistency
      fetchCustomers();
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleBulkArchiveCustomers(selectedCustomers, true)}
                  disabled={isLoading}
                >
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