'use client';

import { PropsWithChildren, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';

/**
 * Redux provider component for Next.js app
 * Ensures the store is properly initialized and available throughout the component tree
 */
export function ReduxProvider({ children }: PropsWithChildren) {
  // Use a ref to ensure the store is only created once
  const storeRef = useRef(store);
  
  return (
    <Provider store={storeRef.current}>
      {children}
    </Provider>
  );
}
