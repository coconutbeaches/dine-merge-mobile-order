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
    setTableNumber(tableNum);
    const session = getGuestSession();
    if (!session) {
      createGuestUser({ table_number: tableNum, first_name: 'Guest' }).catch(console.error);
    }
    router.replace('/menu');
  }, [router]);
  
  return null;
};

export default TableScanRouter;
