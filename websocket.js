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
  socket.send(
    JSON.stringify({
      type: "connected",
    }),
  );

  socket.on("message", async (rawMessage) => {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(rawMessage.toString());

      if (
        parsedMessage === null ||
        typeof parsedMessage !== "object" ||
        Array.isArray(parsedMessage)
      ) {
        logger.warn("Invalid message format", { userId, parsedMessage });
        socket.send(
          JSON.stringify({ type: "error", message: "Invalid message format" }),
        );
        return;
      }

      if (
        typeof parsedMessage.type !== "string" ||
        typeof parsedMessage.payload !== "object" ||
        parsedMessage.payload === null
      ) {
        logger.warn("Invalid message format", {
          userId,
          raw: rawMessage.toString(),
        });
        socket.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message payload format",
          }),
        );
        return;
      }

      if (parsedMessage.type == "chat_message") {
        if (
          typeof parsedMessage.payload.content !== "string" ||
          parsedMessage.payload.content.trim().length === 0
        ) {
          logger.warn("Invalid message content", { userId, parsedMessage });
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Invalid message content",
            }),
          );
          return;
        }

        if (
          typeof parsedMessage.payload.conversationId !== "string" ||
          parsedMessage.payload.conversationId.trim().length === 0
        ) {
          logger.warn("Invalid conversation ID", {
            userId,
            conversationId: parsedMessage.payload.conversationId,
          });
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Invalid conversation ID",
            }),
          );
          return;
        }
      }

      const conversationId = parsedMessage.payload.conversationId;
      const userMessage = parsedMessage.payload.content;
      const conversationPreferences = getPreferences(userId);

      let aiAgent = null;
      let aiModel = null;
      let reasoningLevel = null;
      let verbosityLevel = null;
      if (conversationPreferences) {
        aiAgent = getAiAgentById(conversationPreferences.defaultAgentId);
        aiModel = getAiModelById(conversationPreferences.defaultModelId);
        reasoningLevel = getReasoningLevelById(
          conversationPreferences.defaultReasoningId,
        );
        verbosityLevel = getVerbosityLevelById(
          conversationPreferences.defaultVerbosityId,
        );
      }

      if (parsedMessage.type === "chat_message") {
        let fullAssistantResponse = "";
        const stream = await createChatStream({
          message: userMessage,
          model: aiModel,
          reasoningLevel,
          verbosityLevel,
          temperature: conversationPreferences?.temperature,
          systemPrompt: aiAgent?.systemPrompt,
        });

        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content;

          if (!content) {
            continue;
          }

          fullAssistantResponse += content;

          socket.send(
            JSON.stringify({
              type: "chat_chunk",

              payload: {
                content,
              },
            }),
          );
        }

        const savedConversation = await saveConversationTurn({
          userId,
          conversationId,
          userMessage,
          assistantMessage: fullAssistantResponse,
        });

        socket.send(
          JSON.stringify({
            type: "chat_complete",
            payload: {
              conversationId: savedConversation.conversationId,
            },
          }),
        );
      }
    } catch (error) {
      logger.error("WebSocket request failed.", error, {
        userId,
        messageType: parsedMessage?.type,
      });

      socket.send(
        JSON.stringify({
          type: "error",

          payload: {
            message: "Failed to process websocket request.",
          },
        }),
      );
    }
  });

  socket.on("close", () => {
    remove(userId);

    logger.info("WebSocket disconnected", { userId });
  });
});
