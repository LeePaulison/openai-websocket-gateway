import http from "node:http";

import "dotenv/config";

import { websocketServer } from "./websocket.js";

import { logger } from "./lib/logger.js";
import { getServerConfiguration } from "./lib/config.js";

logger.info("Server starting...");

try {
  const { clientOrigin, corsOrigin, host, port } = getServerConfiguration();

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
    if (request.headers.origin !== clientOrigin) {
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
