import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          accent: "rgb(var(--brand-accent) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "#141414",
          muted: "#6b6b6b",
          faint: "#a3a3a3",
        },
        paper: "#faf9f7",
        sale: "#b42318",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        arabic: ["var(--font-arabic)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.25em",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideInRight: { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        slideInLeft: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
      },
      animation: {
        fadeIn: "fadeIn .25s ease-out",
        slideUp: "slideUp .3s ease-out",
        slideInRight: "slideInRight .3s ease-out",
        slideInLeft: "slideInLeft .3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
