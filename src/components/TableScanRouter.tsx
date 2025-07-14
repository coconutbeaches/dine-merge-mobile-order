'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGuestSession } from '@/utils/guestSession';
import { useGuestContext } from '@/context/GuestContext';
import { useAppContext } from '@/context/AppContext';

const TableScanRouter = () => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { setTableNumber } = useGuestContext();
  const { currentUser, isLoggedIn, isLoading: isUserContextLoading } = useAppContext();

  // Ensure this only runs on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run on client-side
    if (!isClient || isUserContextLoading) {
      console.log('[TableScanRouter] Waiting for client or user context to load.', { isClient, isUserContextLoading });
      return; // Wait for user context to load
    }
    
    // Skip table scan routing for logged in admin users
    if (isLoggedIn && currentUser?.role === 'admin') {
      console.log('[TableScanRouter] Skipping table scan for logged in admin user based on role.', { isLoggedIn, userRole: currentUser.role });
      return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const goto = params.get('goto');              // e.g. "table-7"
    if (!goto?.startsWith('table-')) {
      console.log('[TableScanRouter] No table scan parameter found.');
      return;      // nothing to do
    }
    const tableNum = goto.replace('table-', '');
    
    console.log('[TableScanRouter] Processing table scan:', { goto, tableNum });
    
    const processTableScan = async () => {
      try {
        setTableNumber(tableNum);
        console.log('[TableScanRouter] Table number stored successfully');
      } catch (error) {
        console.warn('[TableScanRouter] Failed to store table number:', error);
      }
      
      const session = getGuestSession();
      console.log('[TableScanRouter] Current guest session:', session);
      
      if (session && session.guest_user_id && session.guest_first_name) {
        console.log('[TableScanRouter] Existing guest session found, redirecting to menu');
        router.replace('/menu');
      } else {
        console.log('[TableScanRouter] No existing guest session, redirecting to registration');
        const registrationUrl = `/register/unknown?table=${tableNum}`;
        console.log('[TableScanRouter] Registration URL:', registrationUrl);
        router.replace(registrationUrl);
      }
    };
    
    processTableScan();
  }, [router, setTableNumber, isClient, currentUser, isLoggedIn, isUserContextLoading]);
  
  return null;
};

export default TableScanRouter;
