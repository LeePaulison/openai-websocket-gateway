import { getAiModels } from "../../repositories/aiModelsRepository.js";

export const aiModelResolvers = {
  Query: {
    aiModels: (_) => getAiModels(),
  },
};
