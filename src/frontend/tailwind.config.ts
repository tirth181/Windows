import type { Config } from "tailwindcss";

/**
 * Brand tokens live in `src/app/globals.css` (:root + @theme).
 * This file documents the LogiForge palette for tooling / IDE support.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "brand-ink": "var(--brand-ink)",
        "brand-steel": "var(--brand-steel)",
        accent: "var(--accent)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        muted: "var(--muted)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Sora", "sans-serif"],
        ui: ["var(--font-ui)", "IBM Plex Sans", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
