/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Only use this config for testing, not for building
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ['./src/test-setup.ts'],
    css: true,
  },
  // Remove server and plugins config that conflict with Next.js
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
