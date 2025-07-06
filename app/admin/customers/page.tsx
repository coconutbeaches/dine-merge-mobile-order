"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CustomersList from '@/components/admin/CustomersList';
import { Profile } from '@/types/supabaseTypes';
import EditCustomerDialog from '@/components/admin/EditCustomerDialog';
import { updateUserProfile, mergeCustomers } from '@/services/userProfileService';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, RefreshCw, Trash2, Merge, Archive, Edit } from 'lucide-react';

export default function CustomersDashboardPage() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [includeArchived, setIncludeArchived] = useState(false);
  
  const fetchCustomers = async (shouldIncludeArchived: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .rpc('get_customers_with_total_spent', { include_archived: shouldIncludeArchived });

      if (supabaseError) {
        console.error('Supabase RPC error in get_customers_with_total_spent:', supabaseError);
        if (supabaseError.message?.includes('could not find') || supabaseError.code === 'PGRST202') {
          console.log('RPC function not found, using fallback query...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('profiles')
            .select('*')
            .order('name');
          
          if (fallbackError) {
            throw new Error(fallbackError.message || 'Failed to fetch customers');
          }
          
          const customersWithDummyData = (fallbackData || []).map(customer => ({
            ...customer,
            total_spent: 0,
            last_order_date: null
          }));
          
          setCustomers(customersWithDummyData);
          console.log('Successfully fetched', customersWithDummyData.length, 'customers (fallback)');
          return;
        }
        throw new Error(supabaseError.message || 'Failed to fetch customers');
      }

      if (!data) {
        setCustomers([]);
        return;
      }

      setCustomers(data);
      console.log('Successfully fetched', data.length, 'customers with real totals');
      console.log('Sample customer data:', data[0]);
    } catch (err) {
      setError(err);
      toast.error(`Failed to fetch customers: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleSelectCustomer = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };
  
  const selectAllCustomers = () => {
    setSelectedCustomers(customers.map(c => c.id));
  };
  
  const clearSelection = () => {
    setSelectedCustomers([]);
  };
  
  const deleteSelectedCustomers = async () => {
    if (selectedCustomers.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', selectedCustomers);
        
      if (error) throw error;
      
      setCustomers(prev => prev.filter(customer => !selectedCustomers.includes(customer.id)));
      setSelectedCustomers([]);
      
      toast.success(`Deleted ${selectedCustomers.length} customer(s)`);
    } catch (error) {
      toast.error(`Failed to delete customers: ${error.message}`);
    }
  };
  
  useEffect(() => {
    fetchCustomers(includeArchived);
  }, [includeArchived]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Profile | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);
  
  const filteredCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    
    let filtered = customers;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = customers.filter(customer => {
        const name = (customer?.name || "").toLowerCase();
        const email = (customer?.email || "").toLowerCase();
        const phone = (customer?.phone || "").toLowerCase();
        return name.includes(s) || email.includes(s) || phone.includes(s);
      });
    }
    
    const sorted = [...filtered].sort((a, b) => {
      let valA, valB;
      
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
        case 'created_at':
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
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
  }, [customers, search, sortKey, sortDirection]);

  const stats = useMemo(() => {
    if (!customers || !Array.isArray(customers)) {
      return { totalCustomers: 0, activeCustomers: 0, totalSpent: 0 };
    }
    return {
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c?.customer_type === 'hotel_guest').length,
      totalSpent: customers.reduce((sum, c) => sum + (c?.total_spent || 0), 0)
    };
  }, [customers]);

  const customersToMerge = useMemo(() => {
    if (!customers || !Array.isArray(customers) || selectedCustomers.length !== 2) return [];
    return customers.filter(c => selectedCustomers.includes(c?.id));
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
      fetchCustomers(includeArchived);
      handleCloseDialog();
    } catch (error: any) {
      console.error('handleSaveChanges error:', error);
      toast.error(`Failed to update customer: ${error.message}`);
    }
  };

  const handleArchiveCustomer = async (customerId: string, isArchived: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ archived: isArchived })
        .eq('id', customerId);

      if (error) throw error;

      toast.success(isArchived ? 'Customer archived successfully!' : 'Customer unarchived successfully!');
      
      if (isArchived && !includeArchived) {
        setCustomers(prev => prev.filter(c => c.id !== customerId));
      } else {
        fetchCustomers(includeArchived);
      }
    } catch (error: any) {
      console.error('Error archiving customer:', error);
      toast.error(`Failed to archive customer: ${error.message}`);
    }
  };

async function toggleCustomerType(id: string, isGuestNow: boolean) {
  const newType = isGuestNow ? null : 'hotel_guest';
  console.log('🔄 Trying to update customer_type for', id, '→', newType);

  const { error } = await supabase
    .from('profiles')
    .update({ customer_type: newType })
    .eq('id', id)
    .select();

  if (error) {
    console.error('❌ Supabase update error:', error);
  } else {
    console.log('✅ Supabase update success');

    setCustomers(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, customer_type: newType }
          : c
      )
    );

    setRecentlyUpdatedId(id);
    setTimeout(() => setRecentlyUpdatedId(null), 1000);
  }
}

  const handleUpdateCustomer = useCallback(async (customerId: string, updates: Partial<Profile>) => {
    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', customerId)
        .select()
        .single();

      if (error) throw error;

      setCustomers(prevCustomers => 
        prevCustomers.map(customer => 
          customer.id === customerId 
            ? { ...customer, ...updates }
            : customer
        )
      );

      return { success: true, data: updatedProfile };
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer');
      return { success: false, error: error };
    }
  }, [setCustomers]);

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
              <CardTitle className="text-sm font-medium">Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCustomers}</div>
              <p className="text-xs text-muted-foreground">Currently staying at hotel</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">฿{stats.totalSpent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
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
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Switch
                    id="show-archived"
                    checked={includeArchived}
                    onCheckedChange={setIncludeArchived}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {includeArchived ? "Archived Customers Visible" : "Archived Customers Hidden"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" onClick={() => fetchCustomers(includeArchived)} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh</span>
            </Button>
            {selectedCustomers.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => deleteSelectedCustomers()}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectedCustomers.forEach(id => handleArchiveCustomer(id, true))}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
                {selectedCustomers.length === 1 && (
                  <Button variant="outline" size="sm" onClick={() => handleEditCustomer(customers.find(c => c.id === selectedCustomers[0]))}>
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
                onUpdateCustomer={handleUpdateCustomer}
                toggleCustomerType={toggleCustomerType}
                recentlyUpdatedId={recentlyUpdatedId}
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