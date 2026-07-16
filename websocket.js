import { WebSocketServer } from "ws";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";

import { createChatStream } from "./lib/openai/chat.js";
import { saveConversationTurn } from "./repositories/conversationRepository.js";
import { getPreferences } from "./repositories/preferencesRepository.js";
import { getAiModelById } from "./repositories/aiModelsRepository.js";
import { getAiAgentById } from "./repositories/aiAgentsRepository.js";
import { createWebSocketConnectionHandler } from "./lib/websocket/connectionHandler.js";
import { logger } from "./lib/logger.js";
import { getServerConfiguration } from "./lib/config.js";

export const websocketServer = new WebSocketServer({ noServer: true });

let jwks;

async function verifyAuthenticationToken(token) {
  const { jwtIssuer, jwtAudience, jwksUrl } = getServerConfiguration();
  jwks ??= createRemoteJWKSet(new URL(jwksUrl));

  const { payload } = await jwtVerify(token, jwks, {
    issuer: jwtIssuer,
    audience: jwtAudience,
    algorithms: ["EdDSA", "ES256", "RS256"],
  });

  if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
    throw new Error("JWT is missing its subject");
  }

  return payload;
}

const handleConnection = createWebSocketConnectionHandler({
  verifyAuthenticationToken,
  decodeToken: decodeJwt,
  getPreferences,
  getAiModelById,
  getAiAgentById,
  createChatStream,
  saveConversationTurn,
  logger,
});

websocketServer.on("connection", handleConnection);
