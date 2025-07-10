'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TableScanRouter from '@/src/components/TableScanRouter';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Only redirect to menu if there are no QR parameters to handle
    // TableScanRouter will handle ?goto=table-X parameters
    const params = new URLSearchParams(window.location.search);
    const goto = params.get('goto');
    
    if (!goto?.startsWith('table-')) {
      // No QR code parameter, redirect to menu
      router.push('/menu');
    }
    // If there is a QR parameter, let TableScanRouter handle it
  }, [router]);

  return (
    <>
      <TableScanRouter />
      <main className="p-8 text-center space-y-6">
        <h1 className="text-2xl font-semibold">Redirecting...</h1>
      </main>
    </>
  );
}
