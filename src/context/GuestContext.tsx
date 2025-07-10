import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
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
      return getTableNumber();
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
