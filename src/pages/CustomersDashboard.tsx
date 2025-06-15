
import React, { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { useCustomersDashboard } from '@/hooks/useCustomersDashboard';
import CustomersList from '@/components/admin/CustomersList';
import CustomersDashboardHeader from '@/components/admin/CustomersDashboardHeader';
import { Profile } from '@/types/supabaseTypes';

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
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CustomersDashboard;
