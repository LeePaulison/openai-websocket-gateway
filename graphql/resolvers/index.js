import { userResolvers } from "./user.js";
import { conversationResolvers } from "./conversations.js";
import { preferencesResolvers } from "./preferences.js";
import { aiModelResolvers } from "./aiModel.js";
import { aiAgentsResolvers } from "./aiAgents.js";
import { reasoningLevelsResolver } from "./reasoningLevels.js";
import { verbosityLevelResolver } from "./verbosityLevel.js";

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...conversationResolvers.Query,
    ...preferencesResolvers.Query,
    ...aiModelResolvers.Query,
    ...aiAgentsResolvers.Query,
    ...reasoningLevelsResolver.Query,
    ...verbosityLevelResolver.Query,
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

  AiModel: {
    ...aiModelResolvers.AiModel,
  },

  AiAgent: {
    ...aiAgentsResolvers.AiAgent,
  },

  ReasoningLevel: {
    ...reasoningLevelsResolver.ReasoningLevel,
  },

  VerbosityLevel: {
    ...verbosityLevelResolver.VerbosityLevel,
  },
};
