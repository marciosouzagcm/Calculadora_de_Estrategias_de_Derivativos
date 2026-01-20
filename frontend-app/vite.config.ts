import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Ajustamos o root para a pasta onde está o seu index.html do frontend
  root: 'frontend-app',
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'recharts': resolve(__dirname, 'node_modules/recharts')
    }
  },
  build: {
    // Garante que o build saia da pasta frontend-app e vá para a dist na raiz
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['recharts', 'react', 'react-dom']
  },
  server: {
    port: 5174,
    host: true,
    // Proxy para evitar erros de CORS durante o desenvolvimento local
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      },
    },
  }
})