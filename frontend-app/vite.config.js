import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Arquivo de configuração do Vite
export default defineConfig({
  plugins: [react()],
  
  // SOLUÇÃO PARA O ERRO 'enablePersistence'
  // Força o Vite a otimizar as dependências do Firebase corretamente
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
    ],
  },
  
  // Garante que o hot-reload funcione com a porta correta
  server: {
    port: 5174, // ajustado para coincidir com o cliente que tenta conectar em 5174
    host: true, // Permite acesso via rede (opcional)
  }
})
