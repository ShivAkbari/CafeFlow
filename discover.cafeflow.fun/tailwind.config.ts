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
        background: "#F7F5EC",
        card: "#FFFEFA",
        // Official Brandbook Colors
        forest: "#002D23",
        "deep-forest": "#001F19",
        "warm-ivory": "#F7F5EC",
        "soft-ink": "#0B1714",
        "muted-brass": "#B99A5B",
        "sage-grey": "#64736D",
        "mist-line": "#DDE3DD",
        porcelain: "#FFFEFA",
        primary: {
          text: "#0B1714",
          action: "#002D23",
          deep: "#001F19",
          hover: "#001F19",
        },
        secondary: {
          text: "#64736D",
        },
        sage: "#E8F0EB",
        selected: "#E8F0EB",
        border: {
          subtle: "#DDE3DD",
        },
        offer: {
          surface: "#F7F5EC",
          badge: "#B99A5B",
        },
        category: {
          all: "#E8F0EB",
          cafe: "#E8F0EB",
          dining: "#E8F0EB",
          fastfood: "#F7F5EC",
          desserts: "#F7F5EC",
          bakery: "#F5EBDD",
        }
      },
      fontFamily: {
        display: ["var(--font-manrope)", "var(--font-plus-jakarta-sans)", "sans-serif"],
        sans: ["var(--font-inter)", "var(--font-plus-jakarta-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 2px 10px rgba(0, 45, 35, 0.03)",
        card: "0 2px 12px rgba(0, 31, 25, 0.04)",
        search: "0 4px 20px rgba(0, 45, 35, 0.06)",
        float: "0 8px 24px rgba(0, 45, 35, 0.12)",
      },
      borderRadius: {
        "control": "10px",
        "card": "16px",
        "xl": "0.875rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
        "hero": "1.5rem",
      }
    },
  },
  plugins: [],
};

export default config;
