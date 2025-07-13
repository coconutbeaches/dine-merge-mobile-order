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
  const { currentUser, isLoggedIn } = useAppContext();

  // Ensure this only runs on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run on client-side
    if (!isClient) return;
    
    // Skip table scan routing for admin and login pages
    if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/login')) {
      console.log('[TableScanRouter] Skipping table scan for admin/login pages');
      return;
    }
    
    // Skip table scan routing for logged in admin users
    if (isLoggedIn && currentUser?.role === 'admin') {
      console.log('[TableScanRouter] Skipping table scan for logged in admin user');
      return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const goto = params.get('goto');              // e.g. "table-7"
    if (!goto?.startsWith('table-')) return;      // nothing to do
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
      console.log('[TableScanRouter] Current session:', session);
      
      if (session && session.guest_user_id && session.guest_first_name) {
        console.log('[TableScanRouter] Existing guest session found, redirecting to menu');
        router.replace('/menu');
      } else {
        console.log('[TableScanRouter] No existing session, redirecting to registration');
        const registrationUrl = `/register/unknown?table=${tableNum}`;
        console.log('[TableScanRouter] Registration URL:', registrationUrl);
        router.replace(registrationUrl);
      }
    };
    
    processTableScan();
  }, [router, setTableNumber, isClient, currentUser, isLoggedIn]);
  
  return null;
};

export default TableScanRouter;
