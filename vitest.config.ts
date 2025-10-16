/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@lib": resolve(__dirname, "./src/lib"),
      "@components": resolve(__dirname, "./src/components"),
      "@db": resolve(__dirname, "./src/db"),
      "@types": resolve(__dirname, "./src/types"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "src/**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "src/pages/**", "src/layouts/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/test/", "src/**/*.d.ts", "src/pages/**", "src/layouts/**", "src/env.d.ts"],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    // Enable watch mode optimizations
    watch: {
      include: ["src/**/*.{ts,tsx,js,jsx}"],
      exclude: ["**/node_modules/**", "**/dist/**"],
    },
  },
});
