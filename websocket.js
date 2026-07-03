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

export const websocketServer = new WebSocketServer({
  noServer: true,
});

websocketServer.on("connection", async (socket, request) => {
  const { authenticated, user, preferences } = await createContext({ request });

  if (!authenticated || !user) {
    socket.close();
    return;
  }

  const userId = user.id;

  register(userId, preferences);

  socket.send(
    JSON.stringify({
      type: "connected",
    }),
  );

  socket.on("message", async (rawMessage) => {
    try {
      const parsedMessage = JSON.parse(rawMessage.toString());

      console.log("WS - parsedMessage: ", parsedMessage);

      if (
        parsedMessage === null ||
        typeof parsedMessage !== "object" ||
        Array.isArray(parsedMessage)
      ) {
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
        socket.send(
          JSON.stringify({ type: "error", message: "Invalid message format" }),
        );
        return;
      }

      if (parsedMessage.type == "chat_message") {
        if (
          typeof parsedMessage.payload.content !== "string" ||
          parsedMessage.payload.content.trim().length === 0
        ) {
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
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Invalid conversation ID",
            }),
          );
          return;
        }
      }

      console.log("Received:", parsedMessage);

      const conversationId = parsedMessage.payload.conversationId;
      const userMessage = parsedMessage.payload.content;
      const conversationPreferences = getPreferences(userId);

      let aiAgent = null;
      let aiModel = null;
      if (conversationPreferences) {
        aiAgent = await getAiAgentById(conversationPreferences.defaultAgentId);
        aiModel = await getAiModelById(conversationPreferences.defaultModelId);
      }

      if (parsedMessage.type === "chat_message") {
        let fullAssistantResponse = "";
        const stream = await createChatStream({
          message: userMessage,
          model: aiModel,
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
      console.error("WebSocket error:", error);

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

    console.log("WebSocket disconnected");
  });
});
