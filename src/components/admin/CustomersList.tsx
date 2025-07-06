"use client";
import React, { useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { User, ChevronUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatThaiCurrencyWithComma } from '@/lib/utils';
import { formatLastOrderDate } from '@/utils/orderDashboardUtils';
import { GroupedCustomer } from '@/types/supabaseTypes';


interface CustomersListProps {
  customers: GroupedCustomer[];
  selectedCustomers: string[];
  toggleSelectCustomer: (customerId: string) => void;
  selectAllCustomers: (customerIds?: string[]) => void;
  clearSelection: () => void;
  onEditCustomer: (customer: GroupedCustomer) => void;
  onArchiveCustomer: (customer: GroupedCustomer, isArchived: boolean) => void;
  recentlyUpdatedId?: string | null;
  sortKey: 'name' | 'total_spent' | 'last_order_date' | 'joined_at' | 'customer_type';
  sortDirection: 'asc' | 'desc';
  handleSort: (key: 'name' | 'total_spent' | 'last_order_date' | 'joined_at' | 'customer_type') => void;
}

const CustomersList: React.FC<CustomersListProps> = ({
  customers,
  selectedCustomers,
  toggleSelectCustomer,
  selectAllCustomers,
  clearSelection,
  onEditCustomer,
  onArchiveCustomer,
  recentlyUpdatedId,
  sortKey,
  sortDirection,
  handleSort,
}) => {
  const allOnPageSelected = customers.length > 0 && selectedCustomers.length === customers.length;
  
  const handleSelectAll = () => {
    if (allOnPageSelected) {
      clearSelection();
    } else {
      selectAllCustomers(customers.map(c => c.customer_id));
    }
  };

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No customers found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your search or filter to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
<div className="relative w-full">
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Customer
                  {sortKey === 'name' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-primary transition-colors text-left min-w-[80px] w-[80px]"
                onClick={() => handleSort('customer_type')}
              >
                <div className="flex items-center gap-1 justify-start">
                  Type
                  {sortKey === 'customer_type' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('total_spent')}
              >
                <div className="flex items-center justify-end gap-1">
                  Total
                  {sortKey === 'total_spent' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-primary transition-colors min-w-[100px] w-[100px]"
                onClick={() => handleSort('last_order_date')}
              >
                <div className="flex items-center gap-1">
                  Ordered
                  {sortKey === 'last_order_date' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="hidden lg:table-cell cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('joined_at')}
              >
                <div className="flex items-center gap-1">
                  Joined
                  {sortKey === 'joined_at' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow 
                key={`${customer.customer_id}-${customer.customer_type}`} 
                className={recentlyUpdatedId === customer.customer_id ? 'animate-pulse bg-muted/20' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedCustomers.includes(customer.customer_id)}
                    onCheckedChange={() => toggleSelectCustomer(customer.customer_id)}
                    aria-label={`Select customer ${customer.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div>
                    <Link 
                      href={`/admin/customer-orders/${customer.customer_id}`} 
                      className="font-medium hover:underline"
                    >
                      {customer.name || 'Unnamed Customer'}
                    </Link>
                    {customer.customer_type === 'guest_family' && (
                      <div className="text-xs text-muted-foreground">{customer.customer_id}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-left w-[80px]">
                  <div className="flex justify-start">
                    <Badge 
                      variant={customer.customer_type === 'auth_user' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {customer.customer_type === 'auth_user' ? 'User' : 'Guest'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatThaiCurrencyWithComma(customer.total_spent)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground w-[100px]">
                  {formatLastOrderDate(customer?.last_order_date)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {customer.joined_at ? format(new Date(customer.joined_at), 'MMM d') : '—'}
                </TableCell>
                
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CustomersList;