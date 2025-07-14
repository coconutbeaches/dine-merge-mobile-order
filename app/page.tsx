'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TableScanRouter from '@/src/components/TableScanRouter';
import { useAppContext } from '@/context/AppContext';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, authReady, error } = useAppContext();

  useEffect(() => {
    const effectTriggerTime = Date.now();
    // Debug logging
    console.log(`[HomePage useEffect] ${effectTriggerTime} - useEffect triggered`);
    console.log(`[HomePage useEffect] ${effectTriggerTime} - authReady: ${authReady}`);
    console.log(`[HomePage useEffect] ${effectTriggerTime} - currentUser:`, currentUser);
    console.log(`[HomePage useEffect] ${effectTriggerTime} - error:`, error);
    
    // Wait for authentication to complete
    if (!authReady) {
      console.log(`[HomePage useEffect] ${Date.now()} - Auth not ready, waiting...`);
      return;
    }
    
    console.log(`[HomePage useEffect] ${Date.now()} - Auth is ready! (authReady === true)`);
    
    // Only redirect to menu if there are no QR parameters to handle
    // TableScanRouter will handle ?goto=table-X parameters
    const params = new URLSearchParams(window.location.search);
    const goto = params.get('goto');
    
    if (!goto?.startsWith('table-')) {
      console.log(`[HomePage useEffect] ${Date.now()} - No table QR parameter, checking user role...`);
      console.log(`[HomePage useEffect] ${Date.now()} - currentUser:`, currentUser);
      console.log(`[HomePage useEffect] ${Date.now()} - currentUser?.role:`, currentUser?.role);
      
      // Check if user is admin and redirect accordingly
      if (authReady && currentUser?.role === 'admin') {
        console.log(`[HomePage useEffect] ${Date.now()} - Admin user detected, redirecting to /admin`);
        router.push('/admin');
      } else {
        console.log(`[HomePage useEffect] ${Date.now()} - Non-admin user, redirecting to /menu`);
        // No QR code parameter, redirect to menu
        router.push('/menu');
      }
    } else {
      console.log(`[HomePage useEffect] ${Date.now()} - Table QR parameter found, letting TableScanRouter handle it`);
    }
    // If there is a QR parameter, let TableScanRouter handle it
  }, [router, currentUser, authReady, error]);

  return (
    <>
      <TableScanRouter />
      <main className="p-8 text-center space-y-6">
        <h1 className="text-2xl font-semibold">Redirecting...</h1>
      </main>
    </>
  );
}
