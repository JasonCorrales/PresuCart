import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        presucart: {
          fondo: "#f7fbf8",
          tinta: "#123126",
          acento: "#16a34a",
          alerta: "#f59e0b",
          peligro: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};

export default config;
