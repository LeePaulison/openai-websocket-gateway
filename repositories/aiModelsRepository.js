import { db } from "../lib/db/sqlite.js";

export const defaultAiModels = [
  {
    modelId: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    description:
      "Highest capability model for reasoning, coding, writing, and complex problem solving.",
  },
  {
    modelId: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    description:
      "Fast, cost-effective model for everyday development and chat.",
  },
  {
    modelId: "gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    description:
      "Advanced coding and reasoning model with excellent instruction following.",
  },
  {
    modelId: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "OpenAI",
    description: "Balanced model optimized for speed, quality, and lower cost.",
  },
];

export function getAiModels() {
  return db
    .prepare(
      `
      SELECT
        id AS modelId,
        provider,
        name,
        description
      FROM ai_models
      WHERE enabled = 1
      ORDER BY provider, name
    `,
    )
    .all();
}

export function getAiModelById(modelId) {
  return db
    .prepare(
      `
      SELECT
        id AS modelId,
        name,
        provider,
        description,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM ai_models
      WHERE id = ?
      `,
    )
    .get(modelId);
}

export function upsertAiModel({ modelId, name, provider, description }) {
  db.prepare(
    `
    INSERT INTO ai_models (
      id,
      name,
      provider,
      description
    )
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id)
    DO UPDATE SET
      name = excluded.name,
      provider = excluded.provider,
      description = excluded.description,
      updated_at = CURRENT_TIMESTAMP
    `,
  ).run(modelId, name, provider, description);

  return getAiModelById(modelId);
}

export function createDefaultAiModels() {
  defaultAiModels.forEach((model) => {
    upsertAiModel(model);
  });
}
