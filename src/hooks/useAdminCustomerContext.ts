
import { useState } from 'react';

interface AdminCustomerContext {
  customerId: string;
  customerName: string;
}

export function useAdminCustomerContext() {
  const [adminCustomerContext, setAdminCustomerContext] = useState<AdminCustomerContext | null>(null);

  return {
    adminCustomerContext,
    setAdminCustomerContext,
  };
}
