
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Profile } from '@/types/supabaseTypes';
import { format } from 'date-fns';

interface CustomersListProps {
  customers: Profile[];
  selectedCustomers: string[];
  toggleSelectCustomer: (customerId: string) => void;
  selectAllCustomers: (customerIds?: string[]) => void;
  clearSelection: () => void;
}

const CustomersList: React.FC<CustomersListProps> = ({
  customers,
  selectedCustomers,
  toggleSelectCustomer,
  selectAllCustomers,
  clearSelection,
}) => {
  const allOnPageSelected = customers.length > 0 && selectedCustomers.length === customers.length;
  
  const handleSelectAll = () => {
    if (allOnPageSelected) {
      clearSelection();
    } else {
      selectAllCustomers(customers.map(c => c.id));
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">
            <Checkbox
              checked={allOnPageSelected}
              onCheckedChange={handleSelectAll}
              aria-label="Select all"
            />
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.length > 0 ? (
          customers.map((customer) => (
            <TableRow key={customer.id} data-state={selectedCustomers.includes(customer.id) ? "selected" : ""}>
              <TableCell>
                <Checkbox
                  checked={selectedCustomers.includes(customer.id)}
                  onCheckedChange={() => toggleSelectCustomer(customer.id)}
                  aria-label={`Select customer ${customer.name}`}
                />
              </TableCell>
              <TableCell>{customer.name || 'N/A'}</TableCell>
              <TableCell>{customer.email}</TableCell>
              <TableCell>{customer.phone || 'N/A'}</TableCell>
              <TableCell className="capitalize">{customer.role}</TableCell>
              <TableCell>{format(new Date(customer.created_at), 'MMM d, yyyy')}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              No customers found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default CustomersList;
