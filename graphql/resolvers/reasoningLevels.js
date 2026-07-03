import { getReasoningLevels } from "../../repositories/reasoningLevelsRepository.js";

export const reasoningLevelsResolver = {
  Query: {
    reasoningLevels: () => getReasoningLevels(),
  },
};
