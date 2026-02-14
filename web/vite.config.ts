import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api/logs": {
        target: "http://localhost:3001",
        changeOrigin: true,
        // SSE requires no buffering
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            proxyRes.headers["cache-control"] = "no-cache";
            proxyRes.headers["connection"] = "keep-alive";
          });
        },
      },
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3001",
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err, _req, _res) => {
            // Silence proxy errors which are often just client disconnects
            if (err.message.includes("ECONNRESET") || err.message.includes("ECONNABORTED")) {
              return;
            }
            console.error("proxy error", err);
          });
          proxy.on("proxyReqWs", (proxyReq, _req, socket) => {
            const destroyTarget = (): void => {
              const targetSocket = proxyReq.socket ?? (proxyReq as unknown as { socket?: NodeJS.Socket }).socket;
              if (targetSocket && !targetSocket.destroyed) {
                targetSocket.destroy();
              }
            };
            socket.on("error", (err: Error) => {
              if (!err.message.includes("ECONNRESET") && !err.message.includes("ECONNABORTED")) {
                console.error("socket error", err);
              }
              destroyTarget();
            });
            socket.on("close", destroyTarget);
          });
        },
      },
    },
  },
});
