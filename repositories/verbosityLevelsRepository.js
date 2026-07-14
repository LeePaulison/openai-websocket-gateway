import { asc, eq, sql } from "drizzle-orm";

import { db } from "../lib/db/neon.js";
import { verbosityLevels } from "../drizzle/verbosityLevels.js";

export const defaultVerbosityLevels = [
  {
    levelId: "low",
    name: "Low",
    description: "Concise, direct responses with minimal detail.",
  },
  {
    levelId: "medium",
    name: "Medium",
    description: "Balanced responses with a moderate level of detail.",
  },
  {
    levelId: "high",
    name: "High",
    description:
      "Detailed responses with explanations and examples where appropriate.",
  },
];

export async function getVerbosityLevels() {
  return db
    .select({
      levelId: verbosityLevels.levelId,
      name: verbosityLevels.name,
      description: verbosityLevels.description,
    })
    .from(verbosityLevels)
    .where(eq(verbosityLevels.enabled, true))
    .orderBy(asc(verbosityLevels.name));
}

export async function getVerbosityLevelById(levelId) {
  const [level] = await db
    .select({
      levelId: verbosityLevels.levelId,
      name: verbosityLevels.name,
      description: verbosityLevels.description,
      createdAt: verbosityLevels.createdAt,
      updatedAt: verbosityLevels.updatedAt,
    })
    .from(verbosityLevels)
    .where(eq(verbosityLevels.levelId, levelId))
    .limit(1);

  return level;
}

export async function upsertVerbosityLevel({
  levelId,
  name,
  description,
}) {
  const [level] = await db
    .insert(verbosityLevels)
    .values({
      levelId,
      name,
      description,
    })
    .onConflictDoUpdate({
      target: verbosityLevels.levelId,
      set: {
        name,
        description,
        updatedAt: new Date(),
      },
    })
    .returning();

  return level;
}

export async function createDefaultVerbosityLevels() {
  await db
    .insert(verbosityLevels)
    .values(defaultVerbosityLevels)
    .onConflictDoUpdate({
      target: verbosityLevels.levelId,
      set: {
        name: sql.raw("excluded.name"),
        description: sql.raw("excluded.description"),
        updatedAt: new Date(),
      },
    });
}
