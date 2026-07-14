import { WebSocketServer } from "ws";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { createChatStream } from "./lib/openai/chat.js";
import { saveConversationTurn } from "./services/conversationService.js";
import { getPreferencesByUserId } from "./repositories/preferencesRepository.js";
import { getAiModelByIdFromApi } from "./repositories/aiModelsRepository.js";
import { getAiAgentByIdFromApi } from "./repositories/aiAgentsRepository.js";
import {
  remove,
} from "./lib/session/sessionManager.js";
import { logger } from "./lib/logger.js";

export const websocketServer = new WebSocketServer({
  noServer: true,
});

const AUTHENTICATION_TIMEOUT_MS = 10_000;
let jwks;

function getAuthConfiguration() {
  const nextjsOrigin = process.env.NEXTJS_ORIGIN?.replace(/\/$/, "");

  if (!nextjsOrigin) {
    throw new Error("NEXTJS_ORIGIN is not defined");
  }

  return {
    issuer: process.env.JWT_ISSUER || nextjsOrigin,
    audience: process.env.JWT_AUDIENCE || nextjsOrigin,
    jwksUrl: new URL("/api/auth/jwks", nextjsOrigin),
  };
}

async function verifyAuthenticationToken(token) {
  const { issuer, audience, jwksUrl } = getAuthConfiguration();
  jwks ??= createRemoteJWKSet(jwksUrl);

  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience,
    algorithms: ["EdDSA", "ES256", "RS256"],
  });

  if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
    throw new Error("JWT is missing its subject");
  }

  return payload;
}

function sendJson(socket, message) {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(message));
}

function sendError(socket, message) {
  sendJson(socket, {
    type: "error",
    payload: { message },
  });
}

websocketServer.on("connection", async (socket, request) => {
  let authenticationState = "unauthenticated";
  let authenticationToken;
  let userId;

  const authenticationTimeout = setTimeout(() => {
    if (authenticationState !== "authenticated") {
      logger.warn("WebSocket authentication timed out", {
        ip: request.socket.remoteAddress,
      });
      sendJson(socket, {
        type: "authentication_error",
        payload: { message: "Authentication timed out" },
      });
      socket.close(1008, "Authentication required");
    }
  }, AUTHENTICATION_TIMEOUT_MS);

  socket.on("message", async (rawMessage) => {
    let parsedMessage;

    try {
      parsedMessage = JSON.parse(rawMessage.toString());

      if (
        parsedMessage === null ||
        typeof parsedMessage !== "object" ||
        Array.isArray(parsedMessage)
      ) {
        logger.warn("Invalid message format", { userId });
        sendError(socket, "Invalid message format");
        return;
      }

      if (
        typeof parsedMessage.type !== "string" ||
        parsedMessage.payload === null ||
        typeof parsedMessage.payload !== "object" ||
        Array.isArray(parsedMessage.payload)
      ) {
        logger.warn("Invalid message payload format", {
          userId,
          raw: rawMessage.toString(),
        });

        sendError(socket, "Invalid message payload format");
        return;
      }

      if (authenticationState !== "authenticated") {
        if (
          authenticationState !== "unauthenticated" ||
          parsedMessage.type !== "authenticate" ||
          typeof parsedMessage.payload.token !== "string" ||
          parsedMessage.payload.token.length === 0
        ) {
          authenticationState = "rejected";
          clearTimeout(authenticationTimeout);
          sendJson(socket, {
            type: "authentication_error",
            payload: { message: "Authentication is required" },
          });
          socket.close(1008, "Authentication required");
          return;
        }

        authenticationState = "authenticating";

        try {
          const claims = await verifyAuthenticationToken(
            parsedMessage.payload.token,
          );

          userId = claims.sub;
          authenticationToken = parsedMessage.payload.token;
          authenticationState = "authenticated";
          clearTimeout(authenticationTimeout);

          logger.info("WebSocket authenticated", { userId });
          sendJson(socket, { type: "authenticated" });
        } catch (error) {
          authenticationState = "rejected";
          clearTimeout(authenticationTimeout);

          let receivedClaims;

          try {
            const { iss, aud } = decodeJwt(parsedMessage.payload.token);
            receivedClaims = { issuer: iss, audience: aud };
          } catch {
            receivedClaims = { issuer: undefined, audience: undefined };
          }

          logger.warn("WebSocket authentication failed", {
            ip: request.socket.remoteAddress,
            error: error.message,
            ...receivedClaims,
          });
          sendJson(socket, {
            type: "authentication_error",
            payload: { message: "Authentication failed" },
          });
          socket.close(1008, "Authentication failed");
        }

        return;
      }

      if (parsedMessage.type !== "chat_message") {
        logger.warn("Unsupported WebSocket message type", {
          userId,
          messageType: parsedMessage.type,
        });

        sendError(socket, "Unsupported message type");
        return;
      }

      const { content, conversationId } = parsedMessage.payload;

      if (typeof content !== "string" || content.trim().length === 0) {
        logger.warn("Invalid message content", { userId });
        sendError(socket, "Invalid message content");
        return;
      }

      const hasValidConversationId =
        conversationId === null ||
        (typeof conversationId === "string" &&
          conversationId.trim().length > 0);

      if (!hasValidConversationId) {
        logger.warn("Invalid conversation ID", {
          userId,
          conversationId,
        });

        sendError(socket, "Invalid conversation ID");
        return;
      }

      const conversationPreferences = await getPreferencesByUserId({
        token: authenticationToken,
      });

      if (!conversationPreferences) {
        logger.warn("Missing conversation preferences", { userId });
        sendError(socket, "Missing conversation preferences");
        return;
      }

      const aiModel = await getAiModelByIdFromApi({
        token: authenticationToken,
        modelId: conversationPreferences.defaultModelId,
      });

      if (!aiModel) {
        logger.warn("Missing AI model", {
          userId,
          modelId: conversationPreferences.defaultModelId,
        });
        sendError(socket, "Selected AI model was not found");
        return;
      }

      const aiAgent = await getAiAgentByIdFromApi({
        token: authenticationToken,
        agentId: conversationPreferences.defaultAgentId,
      });

      if (!aiAgent) {
        logger.warn("Missing AI agent", {
          userId,
          agentId: conversationPreferences.defaultAgentId,
        });
        sendError(socket, "Selected AI agent was not found");
        return;
      }

      let fullAssistantResponse = "";

      const stream = await createChatStream({
        message: content.trim(),
        model: aiModel,
        reasoningLevel: {
          levelId: conversationPreferences.defaultReasoningId,
        },
        verbosityLevel: {
          levelId: conversationPreferences.defaultVerbosityId,
        },
        temperature: conversationPreferences.temperature,
        agentSystemPrompt: aiAgent.systemPrompt,
      });

      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          const delta = event.delta;

          if (!delta) continue;

          fullAssistantResponse += delta;

          sendJson(socket, {
            type: "chat_chunk",
            payload: {
              content: delta,
            },
          });

          continue;
        }

        if (event.type === "response.failed") {
          const message =
            event.response?.error?.message || "OpenAI response failed";

          throw new Error(message);
        }

        if (event.type === "error") {
          throw new Error(event.message || "OpenAI stream failed");
        }
      }

      const savedConversation = await saveConversationTurn({
        token: authenticationToken,
        conversationId,
        userMessage: content.trim(),
        assistantMessage: fullAssistantResponse,
      });

      sendJson(socket, {
        type: "chat_complete",
        payload: savedConversation,
      });
    } catch (error) {
      logger.error("WebSocket request failed.", {
        userId,
        messageType: parsedMessage?.type,
        error: error.message,
        stack: error.stack,
      });

      sendError(socket, "Failed to process websocket request.");
    }
  });

  socket.on("close", () => {
    clearTimeout(authenticationTimeout);
    authenticationToken = undefined;

    if (userId) {
      remove(userId);
      logger.info("WebSocket disconnected", { userId });
    }
  });
});
