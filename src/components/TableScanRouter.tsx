'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGuestSession } from '@/utils/guestSession';
import { isRestaurantHandshakeVerifiedForSession } from '@/lib/restaurantHandshakeSession';
import { useGuestContext } from '@/context/GuestContext';
import { useAppContext } from '@/context/AppContext';

const RESTAURANT_HANDSHAKE_CANARY_TABLE = '6';

const TableScanRouter = () => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { setTableNumber } = useGuestContext();
  const { currentUser, isLoggedIn, isLoading: isUserContextLoading } = useAppContext();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || isUserContextLoading) {
      console.log('[TableScanRouter] Waiting for client or user context to load.', { isClient, isUserContextLoading });
      return;
    }

    if (isLoggedIn && currentUser?.role === 'admin') {
      console.log('[TableScanRouter] Skipping table scan for logged in admin user based on role.', { isLoggedIn, userRole: currentUser.role });
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const goto = params.get('goto');
    if (!goto?.startsWith('table-')) {
      console.log('[TableScanRouter] No table scan parameter found.');
      return;
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
      const table6RequiresHandshake = tableNum === RESTAURANT_HANDSHAKE_CANARY_TABLE;
      const table6HandshakeVerified =
        table6RequiresHandshake && isRestaurantHandshakeVerifiedForSession(session);

      console.log('[TableScanRouter] Current guest session:', session);

      if (
        session &&
        session.guest_user_id &&
        session.guest_first_name &&
        (!table6RequiresHandshake || table6HandshakeVerified)
      ) {
        console.log('[TableScanRouter] Existing verified guest session found, redirecting to menu');
        router.replace('/menu');
      } else {
        console.log('[TableScanRouter] Registration/handshake required');
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
