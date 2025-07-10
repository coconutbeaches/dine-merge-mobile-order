'use client';

import { useEffect, useState } from 'react';
import TableScanRouter from './TableScanRouter';

const ClientOnlyWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <>
      <TableScanRouter />
      {children}
    </>
  );
};

export default ClientOnlyWrapper;
