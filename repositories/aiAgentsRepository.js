import { graphqlRequest } from "../lib/graphql/request.js";

export async function getAiAgentById({ token, agentId }) {
  const data = await graphqlRequest({
    token,
    query: `
      query AiAgentConfiguration($agentId: String!) {
        aiAgentConfiguration(agentId: $agentId) {
          agentId
          systemPrompt
        }
      }
    `,
    variables: { agentId },
  });

  return data.aiAgentConfiguration;
}
