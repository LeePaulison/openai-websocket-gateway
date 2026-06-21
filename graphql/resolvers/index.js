import { userResolvers } from "./user.js";
import { conversationResolvers } from "./conversations.js";
import { preferencesResolvers } from "./preferences.js";

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...conversationResolvers.Query,
    ...preferencesResolvers.Query,
  },

  Mutation: {
    ...preferencesResolvers.Mutation,
  },

  ConversationSummary: {
    ...conversationResolvers.ConversationSummary,
  },

  Conversation: {
    ...conversationResolvers.Conversation,
  },

  Preferences: {
    ...preferencesResolvers.Preferences,
  },
};
