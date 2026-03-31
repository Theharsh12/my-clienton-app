import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  base: "/",

  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2015",           // Important for compatibility
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: "::",
    port: 8080,
  },

  preview: {
    port: 4173,
    host: true,
  },
});