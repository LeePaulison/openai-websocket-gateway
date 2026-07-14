import express from "express";
import http from "http";
import cors from "cors";

import "dotenv/config";

import { websocketServer } from "./websocket.js";

import { logger } from "./lib/logger.js";

const app = express();

logger.info("Server starting...");

try {

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    }),
  );

  app.get("/health", (response) => {
    response.json({
      status: "ok",
    });
  });

  const httpServer = http.createServer(app);

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
