import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#ea580c",
          600: "#c2410c",
          700: "#9a3412",
          800: "#7c2d12",
          900: "#431407",
          950: "#2a0a02",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#fafaf9",
          subtle: "#f5f5f4",
        },
        border: {
          DEFAULT: "#e7e5e4",
          strong: "#d6d3d1",
        },
        text: {
          primary: "#1c1917",
          secondary: "#57534e",
          muted: "#a8a29e",
          inverse: "#ffffff",
        },
        success: {
          DEFAULT: "#16a34a",
          bg: "#f0fdf4",
        },
        warning: {
          DEFAULT: "#d97706",
          bg: "#fffbeb",
        },
        error: {
          DEFAULT: "#dc2626",
          bg: "#fef2f2",
        },
        info: {
          DEFAULT: "#2563eb",
          bg: "#eff6ff",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
