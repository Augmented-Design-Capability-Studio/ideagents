import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        prototype1: resolve(__dirname, "prototype1/index.html"),
        prototype2: resolve(__dirname, "prototype2/index.html"),
        prototype3: resolve(__dirname, "prototype3/index.html"),
        prototype4: resolve(__dirname, "prototype4/index.html"),
        prototype5: resolve(__dirname, "prototype5/index.html"),
        prototype6: resolve(__dirname, "prototype6/index.html"),
        prototype7: resolve(__dirname, "prototype7/index.html"),
      },
    },
  },
});
