import { db } from "../lib/db/sqlite.js";

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

export function getReasoningLevels() {
  const levels = db
    .prepare(
      `
      SELECT
        id AS levelId,
        name,
        description
      FROM reasoning_levels
      WHERE enabled = 1
      ORDER BY name
    `,
    )
    .all();

  return levels;
}

export function getReasoningLevelById(levelId) {
  return db
    .prepare(
      `
      SELECT
        id AS levelId,
        name,
        description,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM reasoning_levels
      WHERE id = ?
      `,
    )
    .get(levelId);
}

export function upsertReasoningLevel({ levelId, name, description }) {
  db.prepare(
    `
    INSERT INTO reasoning_levels (
      id,
      name,
      description
    )
    VALUES (?, ?, ?)
    ON CONFLICT(id)
    DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      updated_at = CURRENT_TIMESTAMP
    `,
  ).run(levelId, name, description);

  return getReasoningLevelById(levelId);
}

export function createDefaultReasoningLevels() {
  defaultReasoningLevels.forEach((level) => {
    upsertReasoningLevel(level);
  });
}
