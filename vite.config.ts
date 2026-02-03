import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        // Mapeia os dois index.html para o build final
        main: path.resolve(__dirname, "frontend-app/index.html"),
        landing: path.resolve(__dirname, "landinpagecalculadora/index.html"),
      },
    },
  },
});