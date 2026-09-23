export default {
  content: ["./index.html", "./src/**/*.{vue,js}"],
  theme: {
    screens: {
      xs: "375px",   // iPhone SE, petits Android
      sm: "640px",   // Tablettes portrait
      md: "768px",   // Tablettes paysage
      lg: "1024px",  // Desktop
      xl: "1280px",  // Grand desktop
      "2xl": "1536px", // Très grand
    },
    extend: {
      colors: {
        brand: {
          50: "#eef7f2",
          100: "#d6ecdf",
          200: "#aed9bf",
          300: "#7dc09a",
          400: "#4fa876",
          500: "#2f8f5c",
          600: "#1f7249",
          700: "#185c3b",
          800: "#124730",
          900: "#0d3624",
        },
        accent: {
          400: "#f6b73c",
          500: "#e8a020",
          600: "#c8841a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
    },
  },
  plugins: [],
};