import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clinic: {
          ink: "#164E63",
          muted: "#47656F",
          surface: "#ECFEFF",
          panel: "#FFFFFF",
          line: "#B6E7F2",
          primary: "#0891B2",
          primaryDark: "#0E7490",
          success: "#059669",
          warning: "#B45309"
        }
      },
      fontFamily: {
        sans: ["var(--font-figtree)", "Noto Sans", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 12px 40px rgba(8, 145, 178, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
