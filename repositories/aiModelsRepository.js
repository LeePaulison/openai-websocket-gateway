import { db } from "../lib/db/sqlite.js";

export const defaultAiModels = [
  {
    modelId: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    description:
      "Highest capability model for reasoning, coding, writing, and complex problem solving.",
    supportsTemperature: 0,
    supportsReasoning: 1,
    supportsVerbosity: 1,
    supportsStreaming: 1,
  },
  {
    modelId: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    description:
      "Fast, cost-effective model for everyday development and chat.",
    supportsTemperature: 0,
    supportsReasoning: 1,
    supportsVerbosity: 1,
    supportsStreaming: 1,
  },
  {
    modelId: "gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    description:
      "Advanced coding and reasoning model with excellent instruction following.",
    supportsTemperature: 1,
    supportsReasoning: 0,
    supportsVerbosity: 0,
    supportsStreaming: 1,
  },
  {
    modelId: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "OpenAI",
    description: "Balanced model optimized for speed, quality, and lower cost.",
    supportsTemperature: 1,
    supportsReasoning: 0,
    supportsVerbosity: 0,
    supportsStreaming: 1,
  },
];

const MODEL_CAPABILITIES = `
  supports_temperature AS supportsTemperature,
  supports_reasoning AS supportsReasoning,
  supports_verbosity AS supportsVerbosity,
  supports_streaming AS supportsStreaming
`;

export function getAiModels() {
  const models = db
    .prepare(
      `
      SELECT
        id AS modelId,
        provider,
        name,
        description,
        ${MODEL_CAPABILITIES}
      FROM ai_models
      WHERE enabled = 1
      ORDER BY provider, name
      `,
    )
    .all();

  return models.map((model) => ({
    ...model,
    supportsTemperature: Boolean(model.supportsTemperature),
    supportsReasoning: Boolean(model.supportsReasoning),
    supportsVerbosity: Boolean(model.supportsVerbosity),
    supportsStreaming: Boolean(model.supportsStreaming),
  }));
}

export function getAiModelById(modelId) {
  const model = db
    .prepare(
      `
      SELECT
        id AS modelId,
        name,
        provider,
        description,
        ${MODEL_CAPABILITIES},
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM ai_models
      WHERE id = ?
      `,
    )
    .get(modelId);

  if (!model) {
    return null;
  }

  return {
    ...model,
    supportsTemperature: Boolean(model.supportsTemperature),
    supportsReasoning: Boolean(model.supportsReasoning),
    supportsVerbosity: Boolean(model.supportsVerbosity),
    supportsStreaming: Boolean(model.supportsStreaming),
  };
}

export function upsertAiModel({
  modelId,
  name,
  provider,
  description,
  supportsTemperature,
  supportsReasoning,
  supportsVerbosity,
  supportsStreaming,
}) {
  db.prepare(
    `
    INSERT INTO ai_models (
      id,
      name,
      provider,
      description,
      supports_temperature,
      supports_reasoning,
      supports_verbosity,
      supports_streaming
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id)
    DO UPDATE SET
      name = excluded.name,
      provider = excluded.provider,
      description = excluded.description,
      supports_temperature = excluded.supports_temperature,
      supports_reasoning = excluded.supports_reasoning,
      supports_verbosity = excluded.supports_verbosity,
      supports_streaming = excluded.supports_streaming,
      updated_at = CURRENT_TIMESTAMP
    `,
  ).run(
    modelId,
    name,
    provider,
    description,
    supportsTemperature,
    supportsReasoning,
    supportsVerbosity,
    supportsStreaming,
  );

  return getAiModelById(modelId);
}

export function createDefaultAiModels() {
  defaultAiModels.forEach((model) => {
    upsertAiModel(model);
  });
}
