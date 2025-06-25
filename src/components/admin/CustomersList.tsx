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
import { Edit, User, Mail, Phone, Calendar, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { formatThaiCurrencyWithComma } from '@/lib/utils';
import { ProfilePictureUploader } from './ProfilePictureUploader';

interface CustomersListProps {
  customers: (Profile & { total_spent: number; avatar_path?: string | null })[];
  selectedCustomers: string[];
  toggleSelectCustomer: (customerId: string) => void;
  selectAllCustomers: (customerIds?: string[]) => void;
  clearSelection: () => void;
  onEditCustomer: (customer: Profile) => void;
  onUpdateCustomer?: (customerId: string, updates: Partial<Profile>) => void;
  toggleCustomerType?: (id: string, isGuestNow: boolean) => void;
  recentlyUpdatedId?: string | null;
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
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="hidden lg:table-cell">Joined</TableHead>
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
                  <div className="flex items-center space-x-3">
                    <ProfilePictureUploader
                      userId={customer.id}
                      currentAvatarUrl={customer.avatar_url || null}
                      currentAvatarPath={customer.avatar_path || null}
                      onUpdate={handleAvatarUpdate(customer.id)}
                      size="sm"
                      className="shrink-0"
                    />
                    <div>
                      <Link 
                        to={`/admin/customer-orders/${customer.id}`} 
                        className="font-medium hover:underline"
                      >
                        {customer.name || 'Unnamed Customer'}
                      </Link>
                      <div className="text-xs text-muted-foreground md:hidden">
                        {customer.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge 
                    variant={customer.customer_type === 'hotel_guest' ? 'default' : 'outline'}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleCustomerType && toggleCustomerType(
                      customer.id,
                      customer.customer_type === 'hotel_guest'
                    )}
                  >
                    {customer.customer_type === 'hotel_guest' ? 'Guest' : 'Walk-in'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    {customer.email}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatThaiCurrencyWithComma(customer.total_spent)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    {format(new Date(customer.created_at), 'MMM d, yyyy')}
                  </div>
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
