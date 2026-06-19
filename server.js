import express from "express";
import http from "http";
import cors from "cors";

import "dotenv/config";

import { toNodeHandler } from "better-auth/node";

import { auth } from "./auth/auth.js";
import { websocketServer } from "./websocket.js";
import { yoga } from "./graphql.js";

import userRouter from "./routes/user.js";

const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT) || 3000;

const app = express();

console.log("Mounting auth routes");

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
  }),
);

app.use("/api/graphql", yoga);

app.use("/api/users", userRouter);

app.all("/api/auth/*", toNodeHandler(auth));

console.log("Auth routes mounted");

app.get("/health", (request, response) => {
  response.json({
    status: "ok",
  });
});

const httpServer = http.createServer(app);

httpServer.on("upgrade", async (request, socket, head) => {
  if (request.url !== "/ws") {
    socket.destroy();
    return;
  }

  try {
    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      websocketServer.emit("connection", websocket, request);
    });
  } catch (error) {
    console.error("WebSocket upgrade failed:", error);

    socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");

    socket.destroy();
  }
});

httpServer.listen(port, () => {
  console.log(`> Server ready on http://${hostname}:${port}`);
});
