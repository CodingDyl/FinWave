import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

const target = "http://api:8000"; // docker service name + port (works from the web container)

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target,
        changeOrigin: true,
        // If your FastAPI routes DO NOT start with `/api`, uncomment this rewrite:
        // rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
