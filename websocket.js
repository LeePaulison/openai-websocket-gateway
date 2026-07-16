import { WebSocketServer } from "ws";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";

import { createChatStream } from "./lib/openai/chat.js";
import { saveConversationTurn } from "./repositories/conversationRepository.js";
import { getPreferences } from "./repositories/preferencesRepository.js";
import { getAiModelById } from "./repositories/aiModelsRepository.js";
import { getAiAgentById } from "./repositories/aiAgentsRepository.js";
import { createWebSocketConnectionHandler } from "./lib/websocket/connectionHandler.js";
import { logger } from "./lib/logger.js";

export function createWebSocketServer(configuration) {
  const websocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: configuration.maxPayloadBytes,
    perMessageDeflate: false,
  });
  const heartbeat = setInterval(() => {
    for (const socket of websocketServer.clients) {
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
  }, configuration.heartbeatIntervalMs);
  heartbeat.unref();
  websocketServer.on("connection", (socket) => {
    socket.isAlive = true;
    socket.on("pong", () => { socket.isAlive = true; });
  });
  websocketServer.on("close", () => clearInterval(heartbeat));
  let jwks;

  async function verifyAuthenticationToken(token) {
    jwks ??= createRemoteJWKSet(new URL(configuration.jwksUrl));
    const { payload } = await jwtVerify(token, jwks, {
      issuer: configuration.jwtIssuer,
      audience: configuration.jwtAudience,
      algorithms: configuration.jwtAlgorithms,
    });

    if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
      throw new Error("JWT is missing its subject");
    }
    return payload;
  }

  websocketServer.on("connection", createWebSocketConnectionHandler({
    verifyAuthenticationToken,
    decodeToken: decodeJwt,
    getPreferences,
    getAiModelById,
    getAiAgentById,
    createChatStream,
    saveConversationTurn,
    logger,
    authenticationTimeoutMs: configuration.authenticationTimeoutMs,
    maxPayloadBytes: configuration.maxPayloadBytes,
    messagesPerMinute: configuration.messagesPerMinute,
    streamIdleTimeoutMs: configuration.streamIdleTimeoutMs,
  }));

  return websocketServer;
}
