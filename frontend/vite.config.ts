import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const backend = process.env.VITE_BACKEND ?? "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    proxy: {
      "/api": backend,
      "/legacy": backend,
      "/promo": backend,
    },
  },
});
