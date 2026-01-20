import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'frontend-app',
  resolve: {
    alias: {
      '@': resolve(__dirname, './frontend-app/src'),
      // Removemos os aliases complexos, pois a versão estável resolve bem sozinha
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})