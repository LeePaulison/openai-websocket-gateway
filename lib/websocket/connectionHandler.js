const DEFAULT_AUTHENTICATION_TIMEOUT_MS = 10_000;

export function createWebSocketConnectionHandler({
  verifyAuthenticationToken,
  decodeToken = () => ({}),
  getPreferences,
  getAiModelById,
  getAiAgentById,
  createChatStream,
  saveConversationTurn,
  logger,
  authenticationTimeoutMs = DEFAULT_AUTHENTICATION_TIMEOUT_MS,
}) {
  return function handleConnection(socket, request) {
    let authenticationState = "unauthenticated";
    let authenticationToken;
    let userId;
    let processing = false;

    function sendJson(message) {
      if (socket.readyState !== socket.OPEN) return;
      socket.send(JSON.stringify(message));
    }

    function sendError(message) {
      sendJson({ type: "error", payload: { message } });
    }

    const authenticationTimeout = setTimeout(() => {
      if (authenticationState !== "authenticated") {
        logger.warn("WebSocket authentication timed out", {
          ip: request.socket.remoteAddress,
        });
        sendJson({
          type: "authentication_error",
          payload: { message: "Authentication timed out" },
        });
        socket.close(1008, "Authentication required");
      }
    }, authenticationTimeoutMs);

    socket.on("message", async (rawMessage) => {
      let parsedMessage;

      try {
        parsedMessage = JSON.parse(rawMessage.toString());

        if (parsedMessage === null || typeof parsedMessage !== "object" || Array.isArray(parsedMessage)) {
          sendError("Invalid message format");
          return;
        }

        if (
          typeof parsedMessage.type !== "string" ||
          parsedMessage.payload === null ||
          typeof parsedMessage.payload !== "object" ||
          Array.isArray(parsedMessage.payload)
        ) {
          sendError("Invalid message payload format");
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
            sendJson({ type: "authentication_error", payload: { message: "Authentication is required" } });
            socket.close(1008, "Authentication required");
            return;
          }

          authenticationState = "authenticating";

          try {
            const claims = await verifyAuthenticationToken(parsedMessage.payload.token);
            userId = claims.sub;
            authenticationToken = parsedMessage.payload.token;
            authenticationState = "authenticated";
            clearTimeout(authenticationTimeout);
            logger.info("WebSocket authenticated", { userId });
            sendJson({ type: "authenticated" });
          } catch (error) {
            authenticationState = "rejected";
            clearTimeout(authenticationTimeout);
            let receivedClaims = {};
            try {
              const { iss, aud } = decodeToken(parsedMessage.payload.token);
              receivedClaims = { issuer: iss, audience: aud };
            } catch {}
            logger.warn("WebSocket authentication failed", {
              ip: request.socket.remoteAddress,
              error: error.message,
              ...receivedClaims,
            });
            sendJson({ type: "authentication_error", payload: { message: "Authentication failed" } });
            socket.close(1008, "Authentication failed");
          }
          return;
        }

        if (parsedMessage.type !== "chat_message") {
          sendError("Unsupported message type");
          return;
        }

        if (processing) {
          sendError("A chat request is already in progress");
          return;
        }

        const { content, conversationId } = parsedMessage.payload;

        if (typeof content !== "string" || content.trim().length === 0) {
          sendError("Invalid message content");
          return;
        }

        const hasValidConversationId =
          conversationId === null ||
          (typeof conversationId === "string" && conversationId.trim().length > 0);

        if (!hasValidConversationId) {
          sendError("Invalid conversation ID");
          return;
        }

        processing = true;

        try {
          const conversationPreferences = await getPreferences({ token: authenticationToken });
          if (!conversationPreferences) {
            sendError("Missing conversation preferences");
            return;
          }

          const aiModel = await getAiModelById({
            token: authenticationToken,
            modelId: conversationPreferences.defaultModelId,
          });
          if (!aiModel) {
            sendError("Selected AI model was not found");
            return;
          }

          const aiAgent = await getAiAgentById({
            token: authenticationToken,
            agentId: conversationPreferences.defaultAgentId,
          });
          if (!aiAgent) {
            sendError("Selected AI agent was not found");
            return;
          }

          let fullAssistantResponse = "";
          const stream = await createChatStream({
            message: content.trim(),
            model: aiModel,
            reasoningLevel: { levelId: conversationPreferences.defaultReasoningId },
            verbosityLevel: { levelId: conversationPreferences.defaultVerbosityId },
            temperature: conversationPreferences.temperature,
            agentSystemPrompt: aiAgent.systemPrompt,
          });

          for await (const event of stream) {
            if (event.type === "response.output_text.delta") {
              if (!event.delta) continue;
              fullAssistantResponse += event.delta;
              sendJson({ type: "chat_chunk", payload: { content: event.delta } });
            } else if (event.type === "response.failed") {
              throw new Error(event.response?.error?.message || "OpenAI response failed");
            } else if (event.type === "error") {
              throw new Error(event.message || "OpenAI stream failed");
            }
          }

          const savedConversation = await saveConversationTurn({
            token: authenticationToken,
            conversationId,
            userMessage: content.trim(),
            assistantMessage: fullAssistantResponse,
          });
          sendJson({ type: "chat_complete", payload: savedConversation });
        } finally {
          processing = false;
        }
      } catch (error) {
        logger.error("WebSocket request failed", error, {
          userId,
          messageType: parsedMessage?.type,
        });
        sendError("Failed to process websocket request.");
      }
    });

    socket.on("close", () => {
      clearTimeout(authenticationTimeout);
      authenticationToken = undefined;
    });
  };
}
