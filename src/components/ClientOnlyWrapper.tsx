'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import TableScanRouter from './TableScanRouter';

const ClientOnlyWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{children}</>;
  }

  // Don't load TableScanRouter on admin, login, or register pages
  const shouldLoadTableScanRouter = !pathname.startsWith('/admin') && !pathname.startsWith('/login') && !pathname.startsWith('/register');

  return (
    <>
      {shouldLoadTableScanRouter && <TableScanRouter />}
      {children}
    </>
  );
};

export default ClientOnlyWrapper;
