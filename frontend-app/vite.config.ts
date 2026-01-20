import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'frontend-app',
  base: '/',
  resolve: {
    // Adicionamos a node_modules da raiz como um local de busca prioritário
    modules: [resolve(__dirname, 'node_modules'), 'node_modules'],
    alias: {
      '@': resolve(__dirname, './src'),
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true // Ajuda com pacotes que misturam import/require
    },
    rollupOptions: {
      // Se o Rollup ainda reclamar de algo, tratamos como externo ou forçamos a resolução
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts'],
        },
      },
    },
  },
  optimizeDeps: {
    // Forçamos o pré-bundle das dependências problemáticas
    include: ['recharts', 'react-smooth', 'lodash', 'recharts-scale']
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