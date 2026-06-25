import {
  getPreferencesByUserId,
  createPreferences,
  updatePreferences as updatePreferencesRepository,
} from "../../repositories/preferencesRepository.js";

import { update } from "../../lib/session/sessionManager.js";

export const preferencesResolvers = {
  Query: {
    preferences: async (_, __, context) => {
      const userId = context.user.id;

      let preferences = getPreferencesByUserId(userId);

      if (!preferences) {
        preferences = createPreferences(userId);
      }

      return preferences;
    },
  },

  Mutation: {
    updatePreferences: async (_, { input }, context) => {
      const userId = context.user.id;

      const preferences = updatePreferencesRepository({
        userId,
        model: input.model,
        temperature: input.temperature,
      });

      update(userId, preferences);

      return preferences;
    },
  },
};
