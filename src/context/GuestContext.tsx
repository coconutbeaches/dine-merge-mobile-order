import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { getTableNumber, setTableNumber as setTableNumberLS } from '../utils/guestSession';

interface GuestSession {
  guest_id: string;
  first_name: string;
  stay_id: string;
}

interface GuestContextType {
  guestSession: GuestSession | null;
  setGuestSession: (session: GuestSession) => void;
  clearGuestSession: () => void;
  getGuestSession: () => GuestSession | null;
  tableNumber: string | null;
  setTableNumber: (tableNumber: string) => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const useGuestContext = () => {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error('useGuestContext must be used within a GuestProvider');
  }
  return context;
};

interface GuestProviderProps {
  children: ReactNode;
}

export const GuestProvider = ({ children }: GuestProviderProps) => {
  const [guestSession, setGuestSessionState] = useState<GuestSession | null>(() => {
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem('guest_session');
      return storedSession ? JSON.parse(storedSession) : null;
    }
    return null;
  });

  const [tableNumber, setTableNumberState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      // Check URL parameters first, then fall back to localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const gotoParam = urlParams.get('goto');
      if (gotoParam?.startsWith('table-')) {
        const tableFromUrl = gotoParam.replace('table-', '');
        console.log('[GuestContext] Initializing table number from URL:', tableFromUrl);
        return tableFromUrl;
      }      
      // Check for direct table parameter
      const tableParam = urlParams.get('table');
      if (tableParam) {
        console.log('[GuestContext] Initializing table number from table param:', tableParam);
        return tableParam;
      }      
      // Fall back to localStorage
      const storedTable = getTableNumber();
      console.log('[GuestContext] Initializing table number from localStorage:', storedTable);
      return storedTable;
    }
    return null;
  });

  const setGuestSession = useCallback((session: GuestSession) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guest_session', JSON.stringify(session));
    }
    setGuestSessionState(session);
  }, []);

  const clearGuestSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('guest_session');
    }
    setGuestSessionState(null);
  }, []);

  const getGuestSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem('guest_session');
      return storedSession ? JSON.parse(storedSession) : null;
    }
    return null;
  }, []);

  const setTableNumber = useCallback((tableNumber: string) => {
    if (typeof window !== 'undefined') {
      setTableNumberLS(tableNumber);
    }
    setTableNumberState(tableNumber);
  }, []);

  // Listen for URL parameter changes and update table number accordingly
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkUrlParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const gotoParam = urlParams.get('goto');
      const tableParam = urlParams.get('table');
      
      let newTableNumber = null;
      
      if (gotoParam?.startsWith('table-')) {
        newTableNumber = gotoParam.replace('table-', '');
        console.log('[GuestContext] URL change detected - goto param:', newTableNumber);
      } else if (tableParam) {
        newTableNumber = tableParam;
        console.log('[GuestContext] URL change detected - table param:', newTableNumber);
      }
      
      if (newTableNumber && newTableNumber !== tableNumber) {
        console.log('[GuestContext] Updating table number from URL:', newTableNumber);
        setTableNumber(newTableNumber);
      }
    };

    // Check immediately
    checkUrlParams();

    // Listen for navigation events
    const handlePopState = () => {
      console.log('[GuestContext] Navigation detected, checking URL params...');
      setTimeout(checkUrlParams, 100); // Small delay to ensure URL is updated
    };

    window.addEventListener('popstate', handlePopState);
    
    // Also listen for the custom event that might be fired by the router
    const handleLocationChange = () => {
      console.log('[GuestContext] Location change detected, checking URL params...');
      setTimeout(checkUrlParams, 100);
    };
    
    window.addEventListener('locationchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('locationchange', handleLocationChange);
    };
  }, [tableNumber, setTableNumber]);

  const value = {
    guestSession,
    setGuestSession,
    clearGuestSession,
    getGuestSession,
    tableNumber,
    setTableNumber,
  };

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
};
