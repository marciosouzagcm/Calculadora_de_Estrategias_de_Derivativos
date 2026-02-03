import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./frontend-app/index.html",
    "./frontend-app/src/**/*.{ts,tsx}",
    "./landinpagecalculadora/index.html",
    "./landinpagecalculadora/src/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
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
  plugins: [require("tailwindcss-animate")],
} satisfies Config;