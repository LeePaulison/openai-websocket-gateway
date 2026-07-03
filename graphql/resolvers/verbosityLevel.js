import { getVerbosityLevels } from "../../repositories/verbosityLevelsRepository.js";

export const verbosityLevelResolver = {
  Query: {
    verbosityLevels: () => getVerbosityLevels(),
  },
};
