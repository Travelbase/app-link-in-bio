import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Production (Dockerfile) sets VITE_APP_BASE=/a/link-in-bio/. Assets then go under
// /a/link-in-bio/public/, the gateway's no-login prefix, so public pages load them without a login.
// Unset (Lovable preview, `npm run dev`) everything stays at the root.
const appBase = process.env.VITE_APP_BASE;
const assetBase = appBase ? `${appBase.replace(/\/?$/, "/")}public/` : "/";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: assetBase,
  build: {
    // The production server serves dist/ as the URL tree, so files land where their URL says.
    outDir: appBase ? `dist${assetBase}` : "dist",
    emptyOutDir: true,
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
