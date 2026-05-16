/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#CC6A47",
          greenDeep: "#B25634",
          ink: "var(--brand-ink)",
          muted: "var(--brand-muted)",
          canvas: "var(--brand-canvas)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
      },
      maxWidth: {
        phone: "430px",
      },
    },
  },
  plugins: [],
};
