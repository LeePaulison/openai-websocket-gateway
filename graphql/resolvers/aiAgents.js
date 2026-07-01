import { getAiAgents } from "../../repositories/aiAgentsRepository.js";

export const aiAgentsResolvers = {
  Query: {
    aiAgents: (_) => getAiAgents(),
  },
};
