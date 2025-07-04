/// <reference types="vitest" />
import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Only use this config for testing, not for building
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ['./src/test-setup.ts'],
  },
  // Remove server and plugins config that conflict with Next.js
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
