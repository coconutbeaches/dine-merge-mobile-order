
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
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface CustomersListProps {
  customers: Profile[];
  selectedCustomers: string[];
  toggleSelectCustomer: (customerId: string) => void;
  selectAllCustomers: (customerIds?: string[]) => void;
  clearSelection: () => void;
  onEditCustomer: (customer: Profile) => void;
}

const CustomersList: React.FC<CustomersListProps> = ({
  customers,
  selectedCustomers,
  toggleSelectCustomer,
  selectAllCustomers,
  clearSelection,
  onEditCustomer,
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
          <TableHead className="hidden md:table-cell">Phone</TableHead>
          <TableHead className="hidden lg:table-cell">Role</TableHead>
          <TableHead className="hidden lg:table-cell">Joined</TableHead>
          <TableHead><span className="sr-only">Actions</span></TableHead>
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
              <TableCell className="hidden md:table-cell">{customer.phone || 'N/A'}</TableCell>
              <TableCell className="hidden lg:table-cell capitalize">{customer.role}</TableCell>
              <TableCell className="hidden lg:table-cell">{format(new Date(customer.created_at), 'MMM d, yyyy')}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => onEditCustomer(customer)}>
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit Customer</span>
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              No customers found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default CustomersList;
