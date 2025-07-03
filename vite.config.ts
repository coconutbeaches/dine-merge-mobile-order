/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ['./src/test-setup.ts'],
    css: true,
  },
  server: {
    // bind to all IPv4 addresses so headless scripts can connect via localhost
    host: '0.0.0.0',
    port: 8080,
    // disable the default error overlay to avoid duplicate element definition
    hmr: {
      overlay: false,
    },
    // proxy Supabase endpoints in development to bypass CORS
    proxy: {
      '/auth/v1': {
        target: 'https://wcplwmvbhreevxvsdmog.supabase.co',
        changeOrigin: true,
      },
      '/rest/v1': {
        target: 'https://wcplwmvbhreevxvsdmog.supabase.co',
        changeOrigin: true,
      },
      '/storage/v1': {
        target: 'https://wcplwmvbhreevxvsdmog.supabase.co',
        changeOrigin: true,
      },
      // Proxy Supabase Realtime websockets
      '/realtime/v1': {
        target: 'https://wcplwmvbhreevxvsdmog.supabase.co',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
