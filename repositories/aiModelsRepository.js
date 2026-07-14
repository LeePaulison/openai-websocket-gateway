import { asc, eq, sql } from "drizzle-orm";

import { db } from "../lib/db/neon.js";
import { aiModels } from "../drizzle/aiModels.js";

export const defaultAiModels = [
  {
    modelId: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    description:
      "Highest capability model for reasoning, coding, writing, and complex problem solving.",
    supportsTemperature: false,
    supportsReasoning: true,
    supportsVerbosity: true,
    supportsStreaming: true,
  },
  {
    modelId: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    description:
      "Fast, cost-effective model for everyday development and chat.",
    supportsTemperature: false,
    supportsReasoning: true,
    supportsVerbosity: true,
    supportsStreaming: true,
  },
  {
    modelId: "gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    description:
      "Advanced coding and reasoning model with excellent instruction following.",
    supportsTemperature: true,
    supportsReasoning: false,
    supportsVerbosity: false,
    supportsStreaming: true,
  },
  {
    modelId: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "OpenAI",
    description: "Balanced model optimized for speed, quality, and lower cost.",
    supportsTemperature: true,
    supportsReasoning: false,
    supportsVerbosity: false,
    supportsStreaming: true,
  },
];

export async function getAiModels() {
  return db
    .select()
    .from(aiModels)
    .where(eq(aiModels.enabled, true))
    .orderBy(asc(aiModels.provider), asc(aiModels.name));
}

export async function getAiModelById(modelId) {
  const [model] = await db
    .select()
    .from(aiModels)
    .where(eq(aiModels.modelId, modelId))
    .limit(1);

  return model ?? null;
}

export async function upsertAiModel({
  modelId,
  name,
  provider,
  description,
  supportsTemperature,
  supportsReasoning,
  supportsVerbosity,
  supportsStreaming,
}) {
  const [model] = await db
    .insert(aiModels)
    .values({
      modelId,
      name,
      provider,
      description,
      supportsTemperature,
      supportsReasoning,
      supportsVerbosity,
      supportsStreaming,
    })
    .onConflictDoUpdate({
      target: aiModels.modelId,
      set: {
        name,
        provider,
        description,
        supportsTemperature,
        supportsReasoning,
        supportsVerbosity,
        supportsStreaming,
        updatedAt: new Date(),
      },
    })
    .returning();

  return model;
}

export async function createDefaultAiModels() {
  await db
    .insert(aiModels)
    .values(defaultAiModels)
    .onConflictDoUpdate({
      target: aiModels.modelId,
      set: {
        name: sql.raw("excluded.name"),
        provider: sql.raw("excluded.provider"),
        description: sql.raw("excluded.description"),
        supportsTemperature: sql.raw("excluded.supports_temperature"),
        supportsReasoning: sql.raw("excluded.supports_reasoning"),
        supportsVerbosity: sql.raw("excluded.supports_verbosity"),
        supportsStreaming: sql.raw("excluded.supports_streaming"),
        updatedAt: new Date(),
      },
    });
}
