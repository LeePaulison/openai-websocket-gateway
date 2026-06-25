import { WebSocketServer } from "ws";
import { createChatStream } from "./lib/openai/chat.js";
import { saveConversationTurn } from "./services/conversationService.js";
import { createContext } from "./graphql/context.js";

import {
  register,
  getPreferences,
  remove,
} from "./lib/session/sessionManager.js";

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

  console.log("WebSocket connected:", userId);

  register(userId, preferences);

  socket.send(
    JSON.stringify({
      type: "connected",
    }),
  );

  socket.on("message", async (rawMessage) => {
    try {
      const parsedMessage = JSON.parse(rawMessage.toString());

      const conversationId = parsedMessage.payload.conversationId;
      const userMessage = parsedMessage.payload.content;
      const conversationPreferences = getPreferences(userId);

      console.log("Received:", parsedMessage);

      if (parsedMessage.type === "chat_message") {
        let fullAssistantResponse = "";
        const stream = await createChatStream({
          message: userMessage,
          preferences: conversationPreferences,
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
