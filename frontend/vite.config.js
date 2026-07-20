import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// wasm-pack (--target web) emits a JS glue file + a .wasm asset.
// Vite serves the .wasm as a static asset; exclude it from dep pre-bundling.
export default defineConfig({
  plugins: [react()],
  server: {
    fs: { allow: [".."] },
  },
  optimizeDeps: {
    exclude: ["wasm_decrypt"],
  },
  assetsInclude: ["**/*.wasm"],
});