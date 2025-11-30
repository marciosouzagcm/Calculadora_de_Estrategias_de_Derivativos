import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  root: '.', // raiz é o diretório frontend-app/
  server: {
    port: 5173,
    open: true,
    strictPort: false, // tenta próxima porta se 5173 estiver ocupada
  },
})
