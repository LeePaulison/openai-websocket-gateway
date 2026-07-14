import { graphqlRequest } from "../lib/graphql/request.js";

const AI_MODEL_FIELDS = `
  modelId
  supportsTemperature
  supportsReasoning
  supportsVerbosity
`;

export async function getAiModels({ token }) {
  const data = await graphqlRequest({
    token,
    query: `
      query AiModels {
        aiModels {
          ${AI_MODEL_FIELDS}
        }
      }
    `,
  });

  return data.aiModels;
}

export async function getAiModelById({ token, modelId }) {
  const models = await getAiModels({ token });

  return models.find((model) => model.modelId === modelId) ?? null;
}
