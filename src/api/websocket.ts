/**
 * WebSocket Handler
 *
 * Manages real-time connections and broadcasts.
 */

import type { ServerWebSocket } from "bun";

export interface WebSocketData {
  createdAt: number;
  ip?: string;
}

const connectedClients = new Set<ServerWebSocket<WebSocketData>>();

export const websocketHandler = {
  open(ws: ServerWebSocket<WebSocketData>) {
    console.log("🔌 WebSocket connected");
    connectedClients.add(ws);

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "WELCOME",
        message: "Connected to Sentimeter Real-time API",
        timestamp: new Date().toISOString(),
      })
    );
  },

  message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
    // Handle incoming messages if needed
    // For now, we just log them
    // console.log("Received:", message);
  },

  close(ws: ServerWebSocket<WebSocketData>) {
    console.log("🔌 WebSocket disconnected");
    connectedClients.delete(ws);
  },

  drain(ws: ServerWebSocket<WebSocketData>) {
    // Handle backpressure if needed
  },
};

/**
 * Broadcast data to all connected clients
 */
export function broadcast(data: any) {
  if (connectedClients.size === 0) return;

  const message = JSON.stringify(data);
  for (const client of connectedClients) {
    // Check if open
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}
