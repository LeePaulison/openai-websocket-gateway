import {
  getPreferencesByUserId,
  createPreferences,
  updatePreferences as updatePreferencesRepository,
} from "../../repositories/preferencesRepository.js";

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
      return updatePreferencesRepository({
        userId: context.user.id,
        model: input.model,
        temperature: input.temperature,
      });
    },
  },
};
