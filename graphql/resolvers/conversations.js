import {
  getUserConversations,
  getConversationById,
} from "../../repositories/conversationRepository.js";

export const conversationResolvers = {
  Query: {
    conversations: async (_, __, context) => {
      if (!context.authenticated) {
        return [];
      }

      return getUserConversations(context.user.id);
    },

    conversation: async (_, { id }, context) => {
      if (!context.authenticated) {
        return null;
      }

      const conversation = await getConversationById(id);

      if (!conversation) {
        return null;
      }

      if (conversation.userId !== context.user.id) {
        return null;
      }

      return conversation;
    },
  },

  ConversationSummary: {
    id: (conversation) => conversation._id.toString(),

    updatedAt: (conversation) => conversation.updatedAt.toISOString(),

    preview: (conversation) => conversation.messages?.[0]?.content ?? null,
  },

  Conversation: {
    id: (conversation) => conversation._id.toString(),

    createdAt: (conversation) => conversation.createdAt.toISOString(),

    updatedAt: (conversation) => conversation.updatedAt.toISOString(),
  },
};
