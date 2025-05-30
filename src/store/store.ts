import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import cartReducer from './cart-slice';

// Root reducer combining all feature reducers
const rootReducer = combineReducers({
  cart: cartReducer,
  // Add other reducers here as the app grows
});

// Store configuration
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable date values in the cart state
        ignoredActions: ['cart/addItem', 'cart/updateQuantity'],
        ignoredPaths: ['cart.lastUpdated'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Export types for TypeScript type safety
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for better TypeScript integration
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
