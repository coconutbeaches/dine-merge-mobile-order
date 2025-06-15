import React, { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { useCustomersDashboard } from '@/hooks/useCustomersDashboard';
import CustomersList from '@/components/admin/CustomersList';
import CustomersDashboardHeader from '@/components/admin/CustomersDashboardHeader';
import { Profile } from '@/types/supabaseTypes';
import EditCustomerDialog from '@/components/admin/EditCustomerDialog';
import { updateUserProfile } from '@/services/userProfileService';
import { toast } from 'sonner';
import { User } from '@/types';

const CustomersDashboard = () => {
  const { 
    customers, 
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

  const handleEditCustomer = (customer: Profile) => {
    setEditingCustomer(customer);
  };

  const handleCloseDialog = () => {
    setEditingCustomer(null);
  };

  const handleSaveChanges = async (name: string, phone: string) => {
    if (!editingCustomer) return;

    try {
      await updateUserProfile({
        id: editingCustomer.id,
        name,
        phone
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
      </div>
    </Layout>
  );
};

export default CustomersDashboard;
