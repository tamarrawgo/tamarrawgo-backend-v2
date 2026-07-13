import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tamarrawgo/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@tamarrawgo/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src/index.ts'),
    },
  },
  server: { port: 3001, proxy: { '/api': { target: 'https://tamarrawgo-backend-v2-production.up.railway.app', changeOrigin: true } } },
});
