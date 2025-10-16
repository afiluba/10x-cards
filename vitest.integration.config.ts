/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@lib': resolve(__dirname, './src/lib'),
      '@components': resolve(__dirname, './src/components'),
      '@db': resolve(__dirname, './src/db'),
      '@types': resolve(__dirname, './src/types'),
    },
  },
  test: {
    environment: 'node', // Integration tests may need Node environment
    setupFiles: ['./src/test/integration-setup.ts'],
    globals: true,
    include: [
      'src/**/*.{integration,int-test}.{js,mjs,cjs,ts,mts,cts}',
      'src/**/__integration__/**/*.{js,mjs,cjs,ts,mts,cts}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/pages/**',
      'src/layouts/**',
      '**/*.unit.test.{js,mjs,cjs,ts,mts,cts}',
      '**/*.spec.{js,mjs,cjs,ts,mts,cts}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/**/*.d.ts',
        'src/pages/**',
        'src/layouts/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    // Longer timeouts for integration tests
    testTimeout: 30000,
    hookTimeout: 15000,
    // Disable watch mode for integration tests
    watch: false,
  },
});
