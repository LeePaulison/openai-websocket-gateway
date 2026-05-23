import {
  appendMessages,
  createConversation,
  getConversationById,
  getUserConversations,
} from "../repositories/conversationRepository.js";

export async function saveConversationTurn({
  conversationId,
  userId,
  userMessage,
  assistantMessage,
}) {
  const messages = [
    {
      role: "user",
      content: userMessage,
      createdAt: new Date(),
    },
    {
      role: "assistant",
      content: assistantMessage,
      createdAt: new Date(),
    },
  ];

  if (!conversationId) {
    return createConversation({
      userId,
      messages,
    });
  }

  return appendMessages({
    conversationId,
    messages,
  });
}

export async function getConversation(conversationId) {
  return getConversationById(conversationId);
}

export async function getUserConversationList(userId) {
  const conversations = await getUserConversations(userId);

  return conversations.map((conversation) => {
    const latestMessage =
      conversation.messages?.[conversation.messages.length - 1];

    const previewText = latestMessage?.content || "Empty conversation";

    const preview =
      previewText.length > 80 ? `${previewText.slice(0, 80)}...` : previewText;

    return {
      id: conversation._id.toString(),

      preview,

      updatedAt: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(conversation.updatedAt),
    };
  });
}
