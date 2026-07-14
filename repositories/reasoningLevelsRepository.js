import { asc, eq, sql } from "drizzle-orm";

import { db } from "../lib/db/neon.js";
import { reasoningLevels } from "../drizzle/reasoningLevels.js";

export const defaultReasoningLevels = [
  {
    levelId: "minimal",
    name: "Minimal",
    description: "Fastest responses with minimal internal reasoning.",
  },
  {
    levelId: "low",
    name: "Low",
    description: "Light reasoning for everyday questions.",
  },
  {
    levelId: "medium",
    name: "Medium",
    description: "Balanced reasoning for coding and technical work.",
  },
  {
    levelId: "high",
    name: "High",
    description: "Deep reasoning for complex analysis and problem solving.",
  },
];

export async function getReasoningLevels() {
  return db
    .select({
      levelId: reasoningLevels.levelId,
      name: reasoningLevels.name,
      description: reasoningLevels.description,
    })
    .from(reasoningLevels)
    .where(eq(reasoningLevels.enabled, true))
    .orderBy(asc(reasoningLevels.name));
}

export async function getReasoningLevelById(levelId) {
  const [level] = await db
    .select({
      levelId: reasoningLevels.levelId,
      name: reasoningLevels.name,
      description: reasoningLevels.description,
      createdAt: reasoningLevels.createdAt,
      updatedAt: reasoningLevels.updatedAt,
    })
    .from(reasoningLevels)
    .where(eq(reasoningLevels.levelId, levelId))
    .limit(1);

  return level;
}

export async function upsertReasoningLevel({
  levelId,
  name,
  description,
}) {
  const [level] = await db
    .insert(reasoningLevels)
    .values({
      levelId,
      name,
      description,
    })
    .onConflictDoUpdate({
      target: reasoningLevels.levelId,
      set: {
        name,
        description,
        updatedAt: new Date(),
      },
    })
    .returning();

  return level;
}

export async function createDefaultReasoningLevels() {
  await db
    .insert(reasoningLevels)
    .values(defaultReasoningLevels)
    .onConflictDoUpdate({
      target: reasoningLevels.levelId,
      set: {
        name: sql.raw("excluded.name"),
        description: sql.raw("excluded.description"),
        updatedAt: new Date(),
      },
    });
}
