import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rook: {
          void: "#05060a",
          ink: "#080a12",
          graphite: "#10131d",
          panel: "#141824",
          line: "#252b3c",
          muted: "#8f9bb3",
          text: "#f7f9ff",
          blue: "#2f8cff",
          violet: "#8a5cff",
          cyan: "#35d8ff",
          green: "#2ee89f",
          amber: "#ffbf47"
        }
      },
      boxShadow: {
        glow: "0 0 40px rgba(47, 140, 255, 0.22)",
        violet: "0 0 50px rgba(138, 92, 255, 0.18)",
        panel: "0 24px 80px rgba(0, 0, 0, 0.42)"
      },
      backgroundImage: {
        "radial-command": "radial-gradient(circle at top left, rgba(47, 140, 255, 0.22), transparent 34%), radial-gradient(circle at 78% 18%, rgba(138, 92, 255, 0.2), transparent 30%), linear-gradient(180deg, #080a12 0%, #05060a 100%)"
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
