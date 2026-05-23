import { WebSocketServer } from "ws";
import { createChatStream } from "./lib/openai/chat.js";
import { saveConversationTurn } from "./services/conversationService.js";

export const websocketServer = new WebSocketServer({
  noServer: true,
});

websocketServer.on("connection", (socket, request) => {
  console.log("WebSocket connected");

  const userId = "dev-user";

  console.log("WebSocket connected:", userId);

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

      console.log("Received:", parsedMessage);

      if (parsedMessage.type === "chat_message") {
        let fullAssistantResponse = "";
        const stream = await createChatStream(parsedMessage.payload.content);

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
    console.log("WebSocket disconnected");
  });
});
