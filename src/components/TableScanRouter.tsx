'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setTableNumber, getGuestSession, createGuestUser } from '@/utils/guestSession';

const TableScanRouter = () => {
  const router = useRouter();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const goto = params.get('goto');              // e.g. "table-7"
    if (!goto?.startsWith('table-')) return;      // nothing to do
    const tableNum = goto.replace('table-', '');
    
    console.log('[TableScanRouter] Processing table scan:', { goto, tableNum });
    
    // Try to set table number, but continue even if it fails (Safari private mode)
    try {
      setTableNumber(tableNum);
      console.log('[TableScanRouter] Table number stored successfully');
    } catch (error) {
      console.warn('[TableScanRouter] Failed to store table number:', error);
    }
    
    const session = getGuestSession();
    console.log('[TableScanRouter] Current session:', session);
    
    if (!session) {
      console.log('[TableScanRouter] No session found, creating guest user');
      createGuestUser({ table_number: tableNum, first_name: 'Guest' })
        .then(newSession => {
          console.log('[TableScanRouter] Guest user created successfully:', newSession);
        })
        .catch(error => {
          console.error('[TableScanRouter] Failed to create guest user:', error);
        });
    } else {
      console.log('[TableScanRouter] Session exists, skipping guest user creation');
    }
    
    router.replace('/menu');
  }, [router]);
  
  return null;
};

export default TableScanRouter;
