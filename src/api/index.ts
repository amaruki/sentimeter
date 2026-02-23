/**
 * API Server Entry Point
 *
 * Bun HTTP server for Sentimeter API.
 */

import { handleCors, jsonResponse } from "./middleware/cors.ts";
import { errorResponse } from "./types.ts";
import { handleRecommendations } from "./routes/recommendations.ts";
import { handleHistory } from "./routes/history.ts";
import { handleRefresh } from "./routes/refresh.ts";
import { handleLogs } from "./routes/logs.ts";
import {
  handleGetScheduler,
  handleStartScheduler,
  handleStopScheduler,
} from "./routes/scheduler.ts";
import { handleAvoid } from "./routes/avoid.ts";
import { handleMarketOutlook } from "./routes/market-outlook.ts";
import { handleAnalyzeTicker } from "./routes/analyze-ticker.ts";
import { handleGetConfig, handlePatchConfig } from "./routes/config.ts";
import { loadOverrides } from "../lib/config-overrides.ts";
import { initDatabase } from "../lib/database/schema.ts";
import { startMonitoring, setBroadcastFn } from "../services/monitor.ts";
import { startTelegramPolling } from "../services/telegram-poller.ts";
import { websocketHandler, broadcast } from "./websocket.ts";
import type { WebSocketData } from "./websocket.ts";
import type { Server } from "bun";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

// Initialize database on startup
console.log("🗃️  Initializing database...");
initDatabase();

// Load config overrides so scheduler and GET /api/config use them
loadOverrides();

// Initialize price monitor
console.log("⏱️  Initializing price monitor...");
setBroadcastFn(broadcast);
startMonitoring(15000);

// Initialize Telegram polling
startTelegramPolling();

console.log(`🚀 Starting Sentimeter API server on port ${PORT}...`);

const server = Bun.serve({
  port: PORT,
  idleTimeout: 120, // 2 minutes for SSE connections

  async fetch(request: Request, server: Server<WebSocketData>): Promise<Response | undefined> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle WebSocket upgrade
    if (path === "/ws") {
      if (server.upgrade(request, { data: { createdAt: Date.now() } })) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    const method = request.method;
    const origin = request.headers.get("Origin");

    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    // Log request
    console.log(`${method} ${path}`);

    try {
      // Health check
      if (path === "/health") {
        return jsonResponse(
          {
            status: "ok",
            service: "sentimeter",
            timestamp: new Date().toISOString(),
          },
          200,
          origin
        );
      }

      // Auth middleware for sensitive endpoints
      const protectedPaths = [
        "/api/config",
        "/api/scheduler",
        "/api/scheduler/start",
        "/api/scheduler/stop",
        "/api/refresh",
      ];

      const isProtected = protectedPaths.some(p => path.startsWith(p));
      
      if (isProtected) {
        const adminPassword = process.env.ADMIN_PASSWORD;
        // Only enforce if password is set in env
        if (adminPassword) {
           const authHeader = request.headers.get("X-Admin-Password");
           if (authHeader !== adminPassword) {
             console.warn(`Unauthorized access attempt to ${path}`);
             return jsonResponse(errorResponse("Unauthorized"), 401, origin);
           }
        }
      }

      // API Routes
      if (path === "/api/recommendations" && method === "GET") {
        return await handleRecommendations(request);
      }

      if (path === "/api/history" && method === "GET") {
        return await handleHistory(request);
      }

      if (path === "/api/refresh" && method === "POST") {
        // Refresh triggers analysis, effectively an admin action? 
        // User request was "secure config page", but refresh is on Dashboard.
        // Dashboard is public. Refresh button is there. 
        // If I protect refresh, public dashboard users can't refresh.
        // I will leave refresh public for now unless explicitly asked to secure it.
        return await handleRefresh(request);
      }

      if (path === "/api/logs" && method === "GET") {
        return handleLogs(request);
      }

      if (path === "/api/config" && method === "GET") {
        return handleGetConfig(request);
      }
      if (path === "/api/config" && method === "PATCH") {
        return await handlePatchConfig(request);
      }

      if (path === "/api/scheduler" && method === "GET") {
        return handleGetScheduler(request);
      }

      if (path === "/api/scheduler/start" && method === "POST") {
        return handleStartScheduler(request);
      }

      if (path === "/api/scheduler/stop" && method === "POST") {
        return handleStopScheduler(request);
      }

      if (path === "/api/avoid" && method === "GET") {
        return handleAvoid(request);
      }

      if (path === "/api/market-outlook" && method === "GET") {
        return handleMarketOutlook(request);
      }

      if (path === "/api/analyze-ticker" && method === "POST") {
        return await handleAnalyzeTicker(request);
      }

      
      // Try serving static files from web/dist
      const webDist = "web/dist";
      let filePath = path;
      if (path === "/") filePath = "/index.html";
      
      // Prevent directory traversal
      if (path.includes("..")) {
         return jsonResponse(errorResponse("Invalid path"), 400, origin);
      }

      const file = Bun.file(`${webDist}${filePath}`);
      if (await file.exists()) {
        return new Response(file);
      }

      // SPA Fallback for HTML requests (client-side routing)
      if (request.headers.get("Accept")?.includes("text/html") && method === "GET") {
        const indexHtml = Bun.file(`${webDist}/index.html`);
        if (await indexHtml.exists()) {
           return new Response(indexHtml);
        }
      }

      // 404 Not Found
      return jsonResponse(errorResponse(`Not found: ${path}`), 404, origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Server error:", message);
      return jsonResponse(errorResponse("Internal server error"), 500, origin);
    }
  },

  websocket: websocketHandler,

  error(error: Error): Response {
    console.error("Unhandled error:", error);
    return jsonResponse(errorResponse("Internal server error"), 500, null);
  },
});

console.log(`✅ Sentimeter API running at http://localhost:${server.port}`);
console.log(`
Available endpoints:
  GET  /health               - Health check
  GET  /api/recommendations  - Get today's stock recommendations
  GET  /api/history          - Get historical recommendations
  POST /api/refresh          - Trigger manual analysis refresh
  GET  /api/logs             - SSE stream for live analysis logs
  GET  /ws                   - WebSocket endpoint
  GET   /api/config           - Get app config
  PATCH /api/config           - Update config overrides
  GET  /api/scheduler        - Get scheduler state
  POST /api/scheduler/start  - Start scheduler
  POST /api/scheduler/stop   - Stop scheduler
  GET  /api/avoid            - Get avoid/unrecommended tickers
  GET  /api/market-outlook   - Get market outlook & sentiment
  POST /api/analyze-ticker   - Analyze individual ticker
`);
