import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'frontend-app',
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Forçamos o redirecionamento do lodash para a node_modules da raiz
      'lodash': resolve(__dirname, 'node_modules/lodash'),
      'recharts': resolve(__dirname, 'node_modules/recharts')
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/], // Garante que dependências CommonJS como lodash sejam convertidas
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts', 'lodash'],
        },
      },
    },
  },
  optimizeDeps: {
    // Incluímos o lodash no pré-processamento para evitar erros de importação
    include: ['recharts', 'react', 'react-dom', 'lodash']
  },
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      },
    },
  }
})