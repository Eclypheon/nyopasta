import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nyopasta/shared': path.resolve(import.meta.dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
