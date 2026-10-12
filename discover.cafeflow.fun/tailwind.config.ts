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
      colors: {
        background: "#FAF8F4",
        card: "#FFFFFF",
        primary: {
          text: "#191D1B",
          action: "#064E3B",
          hover: "#043B2C",
        },
        secondary: {
          text: "#777D79",
        },
        selected: "#EAF3EC",
        border: {
          subtle: "#E9E8E2",
        },
        offer: {
          surface: "#FFF0D5",
          badge: "#C89332",
        },
        category: {
          all: "#E8EFEA",
          cafe: "#E3EFE9",
          dining: "#E8EDF5",
          fastfood: "#FCEEEA",
          desserts: "#FDEFE5",
          bakery: "#FBF3E2",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "DM Sans", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 2px 10px rgba(0, 0, 0, 0.03)",
        card: "0 2px 12px rgba(25, 29, 27, 0.04)",
        search: "0 4px 20px rgba(0, 0, 0, 0.06)",
        float: "0 8px 24px rgba(6, 78, 59, 0.12)",
      },
      borderRadius: {
        "xl": "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
        "hero": "1.75rem",
      }
    },
  },
  plugins: [],
};

export default config;
