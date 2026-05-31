import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "480px",
      sm: "480px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        rook: {
          void: "#F8FAFC",
          ink: "#FFFFFF",
          graphite: "#F1F5F9",
          panel: "#FFFFFF",
          line: "#E2E8F0",
          muted: "#64748B",
          text: "#0F172A",
          blue: "#2563EB",
          violet: "#7C3AED",
          cyan: "#2563EB",
          green: "#16A34A",
          amber: "#D97706"
        }
      },
      boxShadow: {
        glow: "0 8px 30px rgba(15, 23, 42, 0.06)",
        violet: "0 8px 30px rgba(15, 23, 42, 0.06)",
        panel: "0 8px 30px rgba(15, 23, 42, 0.06)"
      },
      backgroundImage: {
        "radial-command": "linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 100%)"
      },
      keyframes: {
        "pulse-line": {
          "0%, 100%": { opacity: "0.36", transform: "scaleX(0.96)" },
          "50%": { opacity: "1", transform: "scaleX(1)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
        "rook-pulse": {
          "0%, 100%": { opacity: "0.72", transform: "scale(0.98)" },
          "50%": { opacity: "1", transform: "scale(1.02)" }
        }
      },
      animation: {
        "pulse-line": "pulse-line 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "rook-pulse": "rook-pulse 3.8s ease-in-out infinite"
      }
    },
  },
  plugins: [],
};

export default config;
