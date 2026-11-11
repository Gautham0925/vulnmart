export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
      colors: {
        navy: { 950: "#060b16", 900: "#0b1220", 800: "#111b30", 700: "#1a2742", 600: "#26365a" },
        brand: { 50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3" },
        surface: { DEFAULT: "#ffffff", muted: "#f5f6fa", line: "#e4e7ee" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.05), 0 1px 3px rgba(15,23,42,.06)",
        pop: "0 10px 30px -10px rgba(15,23,42,.25)",
      },
      borderRadius: { xl: "0.875rem" },
    },
  },
  plugins: [],
};
