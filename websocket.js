import { WebSocketServer } from "ws";
import { createChatStream } from "./lib/openai/chat.js";
import { saveConversationTurn } from "./services/conversationService.js";
import { createContext } from "./graphql/context.js";
import {
  register,
  getPreferences,
  remove,
} from "./lib/session/sessionManager.js";
import { getAiAgentById } from "./repositories/aiAgentsRepository.js";
import { getAiModelById } from "./repositories/aiModelsRepository.js";
import { getReasoningLevelById } from "./repositories/reasoningLevelsRepository.js";
import { getVerbosityLevelById } from "./repositories/verbosityLevelsRepository.js";
import { logger } from "./lib/logger.js";

export const websocketServer = new WebSocketServer({
  noServer: true,
});

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
  const { authenticated, user, preferences } = await createContext({ request });

  if (!authenticated || !user) {
    logger.warn("Unauthorized WebSocket connection attempt", {
      ip: request.socket.remoteAddress,
    });
    socket.close();
    return;
  }

  const userId = user.id;

  register(userId, preferences);

  logger.info("WebSocket connected", { userId });

  sendJson(socket, {
    type: "connected",
  });

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

      if (
        typeof conversationId !== "string" ||
        conversationId.trim().length === 0
      ) {
        logger.warn("Invalid conversation ID", {
          userId,
          conversationId,
        });

        sendError(socket, "Invalid conversation ID");
        return;
      }

      const conversationPreferences = getPreferences(userId);

      if (!conversationPreferences) {
        logger.warn("Missing conversation preferences", { userId });
        sendError(socket, "Missing conversation preferences");
        return;
      }

      const aiAgent = getAiAgentById(conversationPreferences.defaultAgentId);
      const aiModel = getAiModelById(conversationPreferences.defaultModelId);
      const reasoningLevel = getReasoningLevelById(
        conversationPreferences.defaultReasoningId,
      );
      const verbosityLevel = getVerbosityLevelById(
        conversationPreferences.defaultVerbosityId,
      );

      if (!aiModel) {
        logger.warn("Missing AI model", {
          userId,
          modelId: conversationPreferences.defaultModelId,
        });

        sendError(socket, "Selected AI model was not found");
        return;
      }

      let fullAssistantResponse = "";

      const stream = await createChatStream({
        message: content.trim(),
        model: aiModel,
        reasoningLevel,
        verbosityLevel,
        temperature: conversationPreferences.temperature,
        systemPrompt: aiAgent?.systemPrompt,
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
        userId,
        conversationId,
        userMessage: content.trim(),
        assistantMessage: fullAssistantResponse,
      });

      sendJson(socket, {
        type: "chat_complete",
        payload: {
          conversationId: savedConversation.conversationId,
        },
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
    remove(userId);
    logger.info("WebSocket disconnected", { userId });
  });
});
