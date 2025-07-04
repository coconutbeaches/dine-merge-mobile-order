'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import AdminOrderCreator from '@/components/admin/AdminOrderCreator';
import { orderStatusOptions } from '@/utils/orderDashboardUtils';
import { Trash, RefreshCw, Search, Edit } from "lucide-react";
import { OrderStatus } from '@/types/supabaseTypes';

interface OrdersDashboardHeaderProps {
  search: string;
  setSearch: (value: string) => void;
  bulkStatus: OrderStatus | "";
  handleBulkStatusChange: (value: OrderStatus) => void;
  selectedOrders: number[];
  isLoading: boolean;
  deleteSelectedOrders: () => void;
  fetchOrders: () => void;
}

const OrdersDashboardHeader = ({
  search,
  setSearch,
  bulkStatus,
  handleBulkStatusChange,
  selectedOrders,
  isLoading,
  deleteSelectedOrders,
  fetchOrders
}: OrdersDashboardHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <div className="flex-1 flex gap-2 items-center">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders (customer, order #, product)..."
            className="pl-9 pr-2 py-2 text-sm"
            type="search"
            aria-label="Search orders"
          />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-2 items-center">
          <Select
            value={bulkStatus}
            onValueChange={handleBulkStatusChange}
            disabled={selectedOrders.length === 0 || isLoading}
          >
            <SelectTrigger className="w-10 h-10 text-sm font-medium border-gray-300 [&>span]:font-bold p-0 flex justify-center items-center">
              <Edit size={18} />
            </SelectTrigger>
            <SelectContent>
              {orderStatusOptions.map(status => (
                <SelectItem
                  key={status}
                  value={status}
                  className="capitalize text-xs"
                >
                  {status === 'delivery' ? 'Delivery' : status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline" className="text-black"
            disabled={selectedOrders.length === 0 || isLoading}
            onClick={deleteSelectedOrders}
            size="icon"
            aria-label="Delete selected"
          >
            <Trash size={18} />
          </Button>
          <Button
            onClick={fetchOrders}
            disabled={isLoading}
            size="icon"
            variant="outline"
            aria-label="Refresh"
          >
            <RefreshCw size={18} />
          </Button>
          <AdminOrderCreator />
        </div>
      </div>
    </div>
  );
};

export default OrdersDashboardHeader;
