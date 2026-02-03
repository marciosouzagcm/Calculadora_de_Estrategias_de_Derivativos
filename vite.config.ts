import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, "frontend-app/index.html"),
        landing: path.resolve(__dirname, "landinpagecalculadora/index.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
