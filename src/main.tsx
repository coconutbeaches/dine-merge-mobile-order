
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import AppContextProvider from './context/AppContextProvider'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

// Create a client
const queryClient = new QueryClient()

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AppContextProvider>
      <App />
    </AppContextProvider>
  </QueryClientProvider>
);
