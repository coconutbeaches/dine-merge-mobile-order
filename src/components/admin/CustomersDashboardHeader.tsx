
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash, RefreshCw, Search, Users } from "lucide-react";

interface CustomersDashboardHeaderProps {
  search: string;
  setSearch: (value: string) => void;
  selectedCustomers: string[];
  isLoading: boolean;
  deleteSelectedCustomers: () => void;
  fetchCustomers: () => void;
  onMergeClick: () => void;
}

const CustomersDashboardHeader = ({
  search,
  setSearch,
  selectedCustomers,
  isLoading,
  deleteSelectedCustomers,
  fetchCustomers,
  onMergeClick,
}: CustomersDashboardHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <div className="flex-1 flex gap-2 items-center">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers (name, email)..."
            className="pl-9 pr-2 py-2 text-sm"
            type="search"
            aria-label="Search customers"
          />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <Button
          variant="outline"
          disabled={selectedCustomers.length !== 2 || isLoading}
          onClick={onMergeClick}
          size="icon"
          aria-label="Merge selected customers"
          title="Merge selected customers"
        >
          <Users size={18} />
        </Button>
        <Button
          variant="destructive"
          disabled={selectedCustomers.length === 0 || isLoading}
          onClick={deleteSelectedCustomers}
          size="icon"
          aria-label="Delete selected"
        >
          <Trash size={18} />
        </Button>
        <Button
          onClick={fetchCustomers}
          disabled={isLoading}
          size="icon"
          variant="secondary"
          aria-label="Refresh"
        >
          <RefreshCw size={18} />
        </Button>
      </div>
    </div>
  );
};

export default CustomersDashboardHeader;
