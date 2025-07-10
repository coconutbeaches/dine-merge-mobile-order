
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Profile } from '@/types/supabaseTypes';
import { formatThaiCurrency, formatStayId } from '@/lib/utils';

interface CustomerInfoProps {
  customer: Profile;
  totalSpent: number;
}

const CustomerInfo = ({ customer, totalSpent }: CustomerInfoProps) => {
  return (
    <Card className="mb-6 bg-muted/20">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">{customer.name}</h2>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
            {customer.phone && <p className="text-sm">{customer.phone}</p>}
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold">{formatThaiCurrency(totalSpent)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerInfo;
