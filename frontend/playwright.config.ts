import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 45000,
  use: { baseURL: process.env.E2E_BASE ?? "http://127.0.0.1:5173", launchOptions: { executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", args: ["--no-sandbox"] } },
});
