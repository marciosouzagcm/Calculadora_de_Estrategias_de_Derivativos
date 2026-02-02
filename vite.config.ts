import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Removemos a seção de alias para evitar que a Vercel se perca
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'frontend-app/index.html'),
        landinpagecalculadora: resolve(__dirname, 'landinpagecalculadora/index.html')
      }
    }
  },
  server: {
    port: 5174
  }
})