import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json" with { type: "json" };
import path from "path";

// Force inject the web accessible resources
const updatedManifest = {
  ...manifest,
  web_accessible_resources: [
    {
      resources: ["injected.js"],
      matches: ["https://leetcode.com/*", "https://*.leetcode.com/*"]
    }
  ]
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest: updatedManifest })
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  }
});