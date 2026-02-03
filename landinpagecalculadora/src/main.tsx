import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./frontend-app/index.html",
    "./frontend-app/src/**/*.{ts,tsx,js,jsx}",
    "./landinpagecalculadora/index.html",
    "./landinpagecalculadora/src/**/*.{ts,tsx,js,jsx}",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
    },
  },
  // Usamos a variável importada para manter o padrão ESM e evitar erros no navegador
  plugins: [animate],
} satisfies Config;