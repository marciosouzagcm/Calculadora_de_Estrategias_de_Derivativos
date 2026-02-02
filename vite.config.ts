import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // REMOVIDO: root: 'frontend-app' (Isso estava escondendo a landing page)
  
  resolve: {
    alias: {
      // @ agora aponta para o app principal
      '@': resolve(__dirname, './frontend-app/src'),
      // @landing para a landing page
      '@landing': resolve(__dirname, './landinpagecalculadora/src'),
    }
  },
  build: {
    // A pasta dist será criada na raiz
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Agora o Vite vai compilar os dois index.html
        main: resolve(__dirname, 'frontend-app/index.html'),
        landinpagecalculadora: resolve(__dirname, 'landinpagecalculadora/index.html')
      }
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})