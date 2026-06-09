import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        bg: "var(--c-bg)",
        card: "var(--c-card)",
        ink: "var(--c-ink)",
        sub: "var(--c-sub)",
        line: "var(--c-line)",
        green: "var(--c-green)",
        blue: "var(--c-blue)",
        red: "var(--c-red)",
        "delta-pos": "var(--c-delta-pos)",
        "delta-neg": "var(--c-delta-neg)",
        zebra: "var(--c-zebra)",
        "podium-1": "var(--c-podium1)",
        "podium-2": "var(--c-podium2)",
        "podium-3": "var(--c-podium3)",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        pulse: "pulse 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
