import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Remova o root: 'frontend-app' pois o arquivo já está nela
  resolve: {
    alias: {
      // Ajuste o alias para apontar para o src local
      '@': resolve(__dirname, './src'),
    }
  },
  build: {
    // IMPORTANTE: Mude para 'dist' (sem o ../)
    outDir: 'dist',
    emptyOutDir: true
  }
})