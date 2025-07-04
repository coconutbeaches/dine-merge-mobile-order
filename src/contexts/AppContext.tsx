'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type AppContextType = {
  cartCount: number;
  setCartCount: (count: number) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [cartCount, setCartCount] = useState(0);

  return (
    <AppContext.Provider value={{ cartCount, setCartCount }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
