import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("/lucide-react/") || id.includes("/react-icons/")) {
            return "icons";
          }

          if (id.includes("/recharts/")) {
            return "recharts-vendor";
          }

          if (id.includes("/d3-") || id.includes("/victory-vendor/")) {
            return "d3-vendor";
          }

          if (
            id.includes("@radix-ui/react-dialog") ||
            id.includes("@radix-ui/react-alert-dialog") ||
            id.includes("@radix-ui/react-popover") ||
            id.includes("vaul")
          ) {
            return "ui-dialog-vendor";
          }

          if (
            id.includes("@radix-ui/react-select") ||
            id.includes("@radix-ui/react-dropdown-menu") ||
            id.includes("@radix-ui/react-tabs") ||
            id.includes("@radix-ui/react-tooltip") ||
            id.includes("@radix-ui/react-navigation-menu") ||
            id.includes("cmdk") ||
            id.includes("embla-carousel")
          ) {
            return "ui-navigation-vendor";
          }

          if (
            id.includes("@radix-ui") ||
            id.includes("react-resizable-panels") ||
            id.includes("input-otp") ||
            id.includes("react-day-picker")
          ) {
            return "ui-vendor";
          }

          if (id.includes("@uppy")) {
            return "upload-vendor";
          }

          if (
            id.includes("@stripe/") ||
            id.includes("@tosspayments/") ||
            id.includes("/paypal")
          ) {
            return "payment-vendor";
          }

          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform/resolvers") ||
            id.includes("/zod/") ||
            id.includes("zod-validation-error")
          ) {
            return "forms-vendor";
          }

          if (id.includes("@tanstack/react-query") || id.includes("/wouter/")) {
            return "state-vendor";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
