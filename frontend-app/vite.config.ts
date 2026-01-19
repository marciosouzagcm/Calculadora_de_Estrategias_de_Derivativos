import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  resolve: {
    alias: {
      // Usamos um alias para o diretório raiz do pacote
      'recharts': resolve(__dirname, 'node_modules/recharts')
    }
  },
  optimizeDeps: {
    // Forçamos o Recharts a ser pré-processado pelo Vite no início
    include: ['recharts']
  },
  server: {
    port: 5174,
    host: true,
    open: true
  }
})