import type { Config } from "tailwindcss";

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
  // ATUALIZAÇÃO: Substituímos o import/variável pelo require direto para resolver o erro do Rollup no build da Vercel
  plugins: [require("tailwindcss-animate")],
} satisfies Config;