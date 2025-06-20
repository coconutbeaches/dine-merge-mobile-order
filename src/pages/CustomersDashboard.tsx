
import React, { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { useCustomersDashboard } from '@/hooks/useCustomersDashboard';
import CustomersList from '@/components/admin/CustomersList';
import CustomersDashboardHeader from '@/components/admin/CustomersDashboardHeader';
import { Profile } from '@/types/supabaseTypes';
import EditCustomerDialog from '@/components/admin/EditCustomerDialog';
import { updateUserProfile, mergeCustomers } from '@/services/userProfileService';
import { toast } from 'sonner';
import MergeCustomersDialog from '@/components/admin/MergeCustomersDialog';
import { supabase } from '@/integrations/supabase/client';

const CustomersDashboard = () => {
  const {
    customers,
    setCustomers,
    selectedCustomers,
    isLoading,
    fetchCustomers,
    deleteSelectedCustomers,
    toggleSelectCustomer,
    selectAllCustomers,
    clearSelection
  } = useCustomersDashboard();

  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Profile | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);
  const filteredCustomers = useMemo(() => {
    if (!search.trim()) {
      return customers;
    }
    const s = search.trim().toLowerCase();
    return customers.filter(customer => {
      const name = (customer.name || "").toLowerCase();
      const email = (customer.email || "").toLowerCase();
      return name.includes(s) || email.includes(s);
    });
  }, [customers, search]);

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

    // --- Start Security Fix: Input Validation ---
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
    // Simple regex for Thai phone numbers (e.g., 0812345678).
    // Allows for optional hyphens and checks for a plausible length.
    const phoneRegex = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
    if (trimmedPhone && !phoneRegex.test(trimmedPhone)) {
      toast.error("Please enter a valid phone number (e.g., 0812345678).");
      return;
    }
     if (trimmedPhone.replace(/-/g, '').length > 10) {
        toast.error("Phone number seems too long.");
        return;
    }
    // --- End Security Fix ---

    try {
      await updateUserProfile({
        id: editingCustomer.id,
        name: trimmedName,
        phone: trimmedPhone,
      });
      toast.success('Customer updated successfully');
      fetchCustomers();
      handleCloseDialog();
    } catch (error: any) {
      // Log the complete error object for better debugging
      console.error('handleSaveChanges error:', error);
      toast.error(`Failed to update customer: ${error.message}`);
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

    // 🔄 Update local state
    setCustomers(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, customer_type: newType }
          : c
      )
    );

    // ✅ Trigger animation
    setRecentlyUpdatedId(id);
    setTimeout(() => setRecentlyUpdatedId(null), 1000);
  }
}

  return (
    <Layout title="Customer Management" showBackButton={false}>
      <div className="page-container p-4 md:p-6">
        <CustomersDashboardHeader
          search={search}
          setSearch={setSearch}
          selectedCustomers={selectedCustomers}
          isLoading={isLoading}
          deleteSelectedCustomers={deleteSelectedCustomers}
          fetchCustomers={fetchCustomers}
          onMergeClick={handleMergeClick}
        />
        
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading customers...</div>
            ) : (
              <CustomersList
                customers={filteredCustomers}
                selectedCustomers={selectedCustomers}
                toggleSelectCustomer={toggleSelectCustomer}
                selectAllCustomers={() => selectAllCustomers(filteredCustomers.map(c => c.id))}
                clearSelection={clearSelection}
                onEditCustomer={handleEditCustomer}
                toggleCustomerType={toggleCustomerType}
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
