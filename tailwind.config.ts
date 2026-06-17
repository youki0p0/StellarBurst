import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark fantasy / neon board-game palette
        board: {
          900: "#0a0612",
          800: "#130a24",
          700: "#1d1138",
          600: "#2a1a4f",
        },
        neon: {
          purple: "#a855f7",
          pink: "#ec4899",
          cyan: "#22d3ee",
          gold: "#fbbf24",
        },
        card: {
          colorless: "#94a3b8",
          red: "#ef4444",
          blue: "#3b82f6",
          green: "#22c55e",
        },
      },
      boxShadow: {
        neon: "0 0 12px rgba(168,85,247,0.6), 0 0 24px rgba(236,72,153,0.35)",
        "neon-cyan": "0 0 12px rgba(34,211,238,0.6)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        pop: "pop 0.18s ease-out",
        floaty: "floaty 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
