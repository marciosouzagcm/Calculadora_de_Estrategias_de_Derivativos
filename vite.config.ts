import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: root agora aponta para a subpasta
  root: 'frontend-app',
  resolve: {
    alias: {
      // Ajusta o alias para o novo local do arquivo
      '@': resolve(__dirname, './frontend-app/src'),
    }
  },
  build: {
    // Como o root é 'frontend-app', o outDir '../dist' jogará os arquivos na raiz/dist
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:10000'
    }
  }
})