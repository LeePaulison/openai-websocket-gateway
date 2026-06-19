import { userResolvers } from "./user.js";
import { conversationResolvers } from "./conversations.js";

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...conversationResolvers.Query,
  },

  ConversationSummary: {
    ...conversationResolvers.ConversationSummary,
  },

  Conversation: {
    ...conversationResolvers.Conversation,
  },
};
