import http from "node:http";
import { randomUUID } from "node:crypto";

import "dotenv/config";

import { createWebSocketServer } from "./websocket.js";

import { logger } from "./lib/logger.js";
import { getServerConfiguration } from "./lib/config.js";
import { createReadinessCheck } from "./lib/readiness.js";

logger.info("Server starting...");

try {
  const configuration = getServerConfiguration();
  const { clientOrigin, corsOrigin, host, port } = configuration;
  const websocketServer = createWebSocketServer(configuration);
  const checkReadiness = createReadinessCheck({ configuration });

  const httpServer = http.createServer(async (request, response) => {
    const requestId = request.headers["x-request-id"] || randomUUID();
    const startedAt = Date.now();
    const requestOrigin = request.headers.origin;

    response.setHeader("X-Request-ID", requestId);
    response.setHeader("Vary", "Origin");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "no-referrer");

    if (requestOrigin === corsOrigin) {
      response.setHeader("Access-Control-Allow-Origin", corsOrigin);
    }

    response.on("finish", () => {
      logger.info("HTTP request completed", {
        requestId,
        method: request.method,
        path: request.url,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    if (request.method === "OPTIONS") {
      if (requestOrigin !== corsOrigin) {
        response.writeHead(403);
        response.end();
        return;
      }
      response.writeHead(204, {
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
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

    if (request.method === "GET" && pathname === "/ready") {
      const readiness = await checkReadiness();
      const publicChecks = Object.fromEntries(
        Object.entries(readiness.dependencies).map(([name, result]) => [name, result.status]),
      );
      if (!readiness.ready) {
        logger.warn("Readiness check failed", {
          requestId,
          dependencies: readiness.dependencies,
        });
      }
      response.writeHead(readiness.ready ? 200 : 503, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        status: readiness.ready ? "ready" : "not_ready",
        checkedAt: readiness.checkedAt,
        checks: publicChecks,
      }));
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  httpServer.on("upgrade", (request, socket, head) => {
    const requestId = request.headers["x-request-id"] || randomUUID();

    if (websocketServer.clients.size >= configuration.maxConnections) {
      socket.write("HTTP/1.1 503 Service Unavailable\r\nRetry-After: 5\r\n\r\n");
      socket.destroy();
      logger.warn("WebSocket upgrade failed: connection capacity reached", {
        requestId,
        maxConnections: configuration.maxConnections,
      });
      return;
    }

    if (request.headers.origin !== clientOrigin) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();

      logger.warn("WebSocket upgrade failed: invalid origin", {
        origin: request.headers.origin,
        requestId,
      });

      return;
    }

    if (request.url !== "/ws") {
      socket.destroy();

      logger.warn("WebSocket upgrade failed: invalid URL", {
        url: request.url,
        requestId,
      });

      return;
    }

    try {
      websocketServer.handleUpgrade(request, socket, head, (websocket) => {
        websocketServer.emit("connection", websocket, request);
      });
    } catch (error) {
      logger.error("WebSocket upgrade failed", error, { requestId });

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
