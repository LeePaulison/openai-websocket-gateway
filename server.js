import express from "express";
import http from "http";
import cors from "cors";

import "dotenv/config";

import { toNodeHandler } from "better-auth/node";

import { db } from "./lib/db/sqlite.js";
import { auth } from "./auth/auth.js";
import { websocketServer } from "./websocket.js";
import { yoga } from "./graphql.js";

import userRouter from "./routes/user.js";
import { createDefaultAiAgents } from "./repositories/aiAgentsRepository.js";
import { createDefaultAiModels } from "./repositories/aiModelsRepository.js";
import { createDefaultVerbosityLevels } from "./repositories/verbosityLevelsRepository.js";
import { createDefaultReasoningLevels } from "./repositories/reasoningLevelsRepository.js";

const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT) || 3000;

db.exec(`
  CREATE TABLE IF NOT EXISTS preferences (
    user_id TEXT PRIMARY KEY,
    theme TEXT NOT NULL DEFAULT 'dark',
    default_model_id TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
    temperature REAL NOT NULL DEFAULT 0.7,
    default_reasoning_id TEXT NOT NULL DEFAULT 'medium',
    default_verbosity_id TEXT NOT NULL DEFAULT 'medium',
    default_agent_id TEXT NOT NULL DEFAULT 'assistant',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ai_models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      description TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,

      supports_temperature INTEGER NOT NULL DEFAULT 0,
      supports_reasoning INTEGER NOT NULL DEFAULT 0,
      supports_verbosity INTEGER NOT NULL DEFAULT 0,
      supports_streaming INTEGER NOT NULL DEFAULT 0,

      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reasoning_levels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS verbosity_levels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ai_agents (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

createDefaultAiModels();
createDefaultReasoningLevels();
createDefaultVerbosityLevels();
createDefaultAiAgents();

const app = express();

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
