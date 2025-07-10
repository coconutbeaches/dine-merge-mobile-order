'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getGuestSession } from '@/utils/guestSession';
import { useGuestContext } from '@/context/GuestContext';

const TableScanRouter = () => {
  const router = useRouter();
  const { setTableNumber } = useGuestContext();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const goto = params.get('goto');              // e.g. "table-7"
    if (!goto?.startsWith('table-')) return;      // nothing to do
    const tableNum = goto.replace('table-', '');
    
    console.log('[TableScanRouter] Processing table scan:', { goto, tableNum });
    
    const processTableScan = async () => {
      // Try to set table number, but continue even if it fails (Safari private mode)
      try {
        setTableNumber(tableNum);
        console.log('[TableScanRouter] Table number stored successfully');
      } catch (error) {
        console.warn('[TableScanRouter] Failed to store table number:', error);
      }
      
      const session = getGuestSession();
      console.log('[TableScanRouter] Current session:', session);
      
      // Always redirect to registration to get user's name
      // Don't create guest user here - let registration handle it
      console.log('[TableScanRouter] Redirecting to registration to get user name');
      const registrationUrl = `/register/unknown?table=${tableNum}`;
      console.log('[TableScanRouter] Registration URL:', registrationUrl);
      router.replace(registrationUrl);
    };
    
    processTableScan();
  }, [router, setTableNumber]);
  
  return null;
};

export default TableScanRouter;
