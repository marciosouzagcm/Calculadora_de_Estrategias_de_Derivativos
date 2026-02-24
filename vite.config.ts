import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, "frontend-app/index.html"),
        landing: path.resolve(__dirname, "landingpagecalculadora/index.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // ADICIONE ESTA LINHA ABAIXO:
      "../strategies": path.resolve(__dirname, "./src/strategies"),
    },
  },
  // Opcional: Adicione este bloco para garantir que o Vitest entenda o ambiente
  test: {
    globals: true,
    environment: 'node',
  },
});