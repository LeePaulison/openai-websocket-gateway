import http from "node:http";

import "dotenv/config";

import { websocketServer } from "./websocket.js";

import { logger } from "./lib/logger.js";

logger.info("Server starting...");

try {
  const corsOrigin =
    process.env.CORS_ORIGIN ||
    process.env.NEXTJS_ORIGIN?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const httpServer = http.createServer((request, response) => {
    response.setHeader("Access-Control-Allow-Origin", corsOrigin);
    response.setHeader("Vary", "Origin");

    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Headers":
          request.headers["access-control-request-headers"] || "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      });
      response.end();
      return;
    }

    const pathname = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`,
    ).pathname;

    if (request.method === "GET" && pathname === "/health") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  httpServer.on("upgrade", (request, socket, head) => {
    const allowedOrigin = process.env.NEXTJS_ORIGIN?.replace(/\/$/, "");

    if (!allowedOrigin || request.headers.origin !== allowedOrigin) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();

      logger.warn("WebSocket upgrade failed: invalid origin", {
        origin: request.headers.origin,
      });

      return;
    }

    if (request.url !== "/ws") {
      socket.destroy();

      logger.warn("WebSocket upgrade failed: invalid URL", {
        url: request.url,
      });

      return;
    }

    try {
      websocketServer.handleUpgrade(request, socket, head, (websocket) => {
        websocketServer.emit("connection", websocket, request);
      });
    } catch (error) {
      logger.error("WebSocket upgrade failed", error);

      socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");

      socket.destroy();
    }
  });

  httpServer.on("error", (error) => {
    logger.error("HTTP server failed", error);
    process.exit(1);
  });

  const host = process.env.HOST || "0.0.0.0";
  const port = Number(process.env.PORT) || 8080;

  httpServer.listen(port, host, () => {
    logger.info("Server ready", {
      host,
      port,
    });
  });
} catch (error) {
  logger.error("Server startup failed", error);
  process.exit(1);
}
