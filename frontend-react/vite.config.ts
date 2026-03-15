import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxy = {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true
  }
};

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react-core';
          }
          if (id.includes('react-router-dom')) {
            return 'router';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'query';
          }
          if (id.includes('recharts')) {
            return 'charts';
          }
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          if (id.includes('axios')) {
            return 'http';
          }
          if (id.includes('date-fns')) {
            return 'date';
          }
          if (id.includes('zustand')) {
            return 'state';
          }
          return 'vendor';
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: apiProxy
  },
  preview: {
    port: 4173,
    proxy: apiProxy
  }
});
