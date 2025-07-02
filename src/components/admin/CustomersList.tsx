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
// Use CustomerWithDetails from useFetchCustomers for the customer type
import { CustomerWithDetails } from '@/hooks/useFetchCustomers';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit, User, Loader2 } from 'lucide-react'; // Added Loader2
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { formatThaiCurrencyWithComma } from '@/lib/utils';
import { ProfilePictureUploader } from './ProfilePictureUploader';
import { formatLastOrderDate } from '@/utils/orderDashboardUtils';
import { Profile } from '@/types/supabaseTypes'; // Keep for onEditCustomer if its signature is strict

interface CustomersListProps {
  customers: CustomerWithDetails[]; // Use the more detailed type
  selectedCustomers: string[];
  toggleSelectCustomer: (customerId: string) => void;
  selectAllCustomers: (customerIds?: string[]) => void;
  clearSelection: () => void;
  onEditCustomer: (customer: Profile) => void; // Profile might be okay if CustomerWithDetails is a superset
  onUpdateCustomer?: (customerId: string, updates: Partial<Profile>) => void;
  toggleCustomerType?: (id: string, isGuestNow: boolean) => void;
  recentlyUpdatedId?: string | null;
  // Pagination props
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
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
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}) => {
  // Select all logic should consider only currently displayed customers
  const allOnPageSelected = customers.length > 0 &&
                            customers.every(c => selectedCustomers.includes(c.id)) &&
                            selectedCustomers.length === customers.length;
  
  const handleSelectAll = () => {
    if (allOnPageSelected) {
      // If all currently shown are selected, clear selection of only these shown customers
      // Or clear all selection entirely, depending on desired UX. Here, clearing all.
      clearSelection();
    } else {
      selectAllCustomers(customers.map(c => c.id));
    }
  };

  const handleAvatarUpdate = useCallback((customerId: string) =>
    (newAvatarUrl: string | null, newAvatarPath: string | null) => {
      if (onUpdateCustomer) {
        // Ensure avatar_path is handled if it's part of your Profile type for updates
        onUpdateCustomer(customerId, {
          avatar_url: newAvatarUrl,
          ...(newAvatarPath !== undefined && { avatar_path: newAvatarPath })
        });
      }
    },
    [onUpdateCustomer]
  );

  // Show this message only if no customers are loaded yet AND not loading more.
  // If hasNextPage is true, it means there might be more, so "Load More" should be available.
  if (customers.length === 0 && !isFetchingNextPage && !hasNextPage) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No customers found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your search or filter, or there might be no customers matching.
        </p>
      </div>
    );
  }

  // If customers array is empty but there is a next page or it's fetching,
  // it implies we are past the initial load, or a filter cleared results.
  // The "Load More" button below will handle fetching more if available.
  // If customers.length is 0 and hasNextPage is true, it implies the current page was empty.

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
                  aria-label="Select all customers on this page"
                />
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead className="hidden lg:table-cell">Last Order</TableHead>
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
                      // Assuming avatar_path might not be directly on CustomerWithDetails unless added
                      currentAvatarPath={(customer as any).avatar_path || null}
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
                  {customer.email}
                </TableCell>
                <TableCell className="text-right">
                  {formatThaiCurrencyWithComma(customer.total_spent || 0)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {formatLastOrderDate(customer.last_order_date)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {customer.created_at ? format(new Date(customer.created_at), 'MMM d, yyyy') : 'N/A'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditCustomer(customer as Profile)} // Cast if needed by onEditCustomer
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {customers.length > 0 && hasNextPage && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Customers'
            )}
          </Button>
        </div>
      )}
       {(customers.length === 0 && hasNextPage) && (
         <div className="flex justify-center mt-4">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load Customers'
            )}
          </Button>
        </div>
       )}
    </div>
  );
};

export default CustomersList;
