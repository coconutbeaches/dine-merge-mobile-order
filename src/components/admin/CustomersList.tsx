
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
import { formatThaiCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface CustomersListProps {
  customers: (Profile & { total_spent: number })[];
  selectedCustomers: string[];
  toggleSelectCustomer: (customerId: string) => void;
  selectAllCustomers: (customerIds?: string[]) => void;
  clearSelection: () => void;
  onEditCustomer: (customer: Profile) => void;
  toggleCustomerType?: (id: string, isGuestNow: boolean) => void;
}

const CustomersList: React.FC<CustomersListProps> = ({
  customers,
  selectedCustomers,
  toggleSelectCustomer,
  selectAllCustomers,
  clearSelection,
  onEditCustomer,
  toggleCustomerType,
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
          <TableHead>Total Spent</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="hidden md:table-cell">Phone</TableHead>
          <TableHead className="hidden lg:table-cell">Role</TableHead>
          <TableHead className="hidden lg:table-cell w-[150px]">Joined</TableHead>
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.length > 0 ? (
          customers.map((customer) => (
            <TableRow key={`${customer.id}-${customer.customer_type || 'none'}`} data-state={selectedCustomers.includes(customer.id) ? "selected" : ""}>
              <TableCell>
                <Checkbox
                  checked={selectedCustomers.includes(customer.id)}
                  onCheckedChange={() => toggleSelectCustomer(customer.id)}
                  aria-label={`Select customer ${customer.name}`}
                />
              </TableCell>
              <TableCell>
                <Link to={`/admin/customer-orders/${customer.id}`} className="font-medium hover:underline">
                  {customer.name || 'N/A'}
                </Link>
              </TableCell>
              <TableCell className="font-medium">{formatThaiCurrency(customer.total_spent)}</TableCell>
              <TableCell>{customer.email}</TableCell>
              <TableCell className="hidden md:table-cell">{customer.phone || 'N/A'}</TableCell>
              <TableCell
                onClick={() => {
                  console.log('Clicked:', customer.id)
                  toggleCustomerType &&
                    toggleCustomerType(
                      customer.id,
                      customer.customer_type === 'hotel_guest'
                    )
                }}
                className={`hidden lg:table-cell capitalize cursor-pointer px-4 py-2 text-sm font-medium rounded transition-colors duration-200 ease-in-out ${
                  customer.customer_type === 'hotel_guest'
                    ? 'text-green-700 bg-green-100'
                    : 'text-gray-700 hover:text-black'
                }`}
                title="Click to toggle"
              >
                {customer.customer_type === 'hotel_guest' ? 'Guest' : 'Customer'}
              </TableCell>
              <TableCell className="hidden lg:table-cell whitespace-nowrap">{format(new Date(customer.created_at), 'MMM d, yyyy')}</TableCell>
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
            <TableCell colSpan={8} className="h-24 text-center">
              No customers found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default CustomersList;
