import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Define a subpasta do frontend como a raiz do processamento do Vite
  root: 'frontend-app',
  // Garante que os caminhos dos assets sejam relativos à raiz do domínio
  base: '/',
  resolve: {
    alias: {
      // Alias '@' apontando corretamente para o src dentro da subpasta
      '@': resolve(__dirname, './frontend-app/src'),
    }
  },
  build: {
    // Define que o resultado final deve ir para a pasta /dist na raiz do projeto
    outDir: '../dist',
    // Limpa a pasta dist antes de cada novo build
    emptyOutDir: true,
    // Melhora a compatibilidade de módulos para o deploy
    target: 'esnext',
    minify: 'esbuild'
  },
  server: {
    port: 5174,
    proxy: {
      // Redireciona chamadas de API para o servidor backend local durante o desenvolvimento
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})