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
import { Profile } from '@/types/supabaseTypes';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit, User, Mail, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatThaiCurrencyWithComma } from '@/lib/utils';
import { ProfilePictureUploader } from './ProfilePictureUploader';
import { formatLastOrderDate } from '@/utils/orderDashboardUtils';

interface CustomersListProps {
  customers: (
    Profile & {
      total_spent: number
      last_order_date: string | null
      avatar_path?: string | null
      avatar_url?: string | null
    }
  )[];
  selectedCustomers: string[];
  toggleSelectCustomer: (customerId: string) => void;
  selectAllCustomers: (customerIds?: string[]) => void;
  clearSelection: () => void;
  onEditCustomer: (customer: Profile) => void;
  onUpdateCustomer?: (customerId: string, updates: Partial<Profile>) => void;
  toggleCustomerType?: (id: string, isGuestNow: boolean) => void;
  recentlyUpdatedId?: string | null;
  sortKey: 'name' | 'total_spent' | 'last_order_date' | 'created_at';
  sortDirection: 'asc' | 'desc';
  handleSort: (key: 'name' | 'total_spent' | 'last_order_date' | 'created_at') => void;
}

const CustomersList: React.FC<CustomersListProps> = ({
  customers,
  selectedCustomers,
  toggleSelectCustomer,
  selectAllCustomers,
  clearSelection,
  onEditCustomer,
  onUpdateCustomer,
  toggleCustomerType,
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
      selectAllCustomers(customers.map(c => c.id));
    }
  };

  const handleAvatarUpdate = useCallback((customerId: string) =>
    (newAvatarUrl: string | null, newAvatarPath: string | null) => {
      if (onUpdateCustomer) {
        onUpdateCustomer(customerId, {
          avatar_url: newAvatarUrl,
          avatar_path: newAvatarPath
        });
      }
    },
    [onUpdateCustomer]
  );


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
                  Status
                  {sortKey === 'customer_type' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
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
                  Last Order
                  {sortKey === 'last_order_date' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="hidden lg:table-cell cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Joined
                  {sortKey === 'created_at' && (
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
                key={`${customer.id}-${customer.customer_type || 'none'}`} 
                className={recentlyUpdatedId === customer.id ? 'animate-pulse bg-muted/20' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedCustomers.includes(customer.id)}
                    onCheckedChange={() => toggleSelectCustomer(customer.id)}
                    aria-label={`Select customer ${customer.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div>
                    <Link 
                      href={`/admin/customer-orders/${customer.id}`} 
                      className="font-medium hover:underline"
                    >
                      {customer.name || 'Unnamed Customer'}
                    </Link>
                    <div className="text-xs text-muted-foreground md:hidden">
                      {customer.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-left w-[80px]">
                  <div className="flex justify-start">
                    <Badge 
                      variant={customer.customer_type === 'hotel_guest' ? 'default' : 'outline'}
                      className={`cursor-pointer hover:opacity-80 transition-opacity text-xs ${
                        customer.customer_type === 'hotel_guest' ? '-ml-2' : 'ml-0'
                      }`}
                      onClick={() => toggleCustomerType && toggleCustomerType(
                        customer.id,
                        customer.customer_type === 'hotel_guest'
                      )}
                    >
                      {customer.customer_type === 'hotel_guest' ? 'Guest' : 'Out'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {customer.email}
                </TableCell>
                <TableCell className="text-right">
                  {formatThaiCurrencyWithComma(customer.total_spent)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground w-[100px]">
                  {formatLastOrderDate(customer?.last_order_date)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {format(new Date(customer.created_at), 'MMM d')}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditCustomer(customer)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
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
