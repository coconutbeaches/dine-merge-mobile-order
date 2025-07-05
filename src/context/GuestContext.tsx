import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

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

  const value = {
    guestSession,
    setGuestSession,
    clearGuestSession,
    getGuestSession,
  };

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
};
