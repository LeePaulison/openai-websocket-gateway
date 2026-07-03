import { db } from "../lib/db/sqlite.js";

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

export function getVerbosityLevels() {
  return db
    .prepare(
      `
      SELECT
        id AS levelId,
        name,
        description
      FROM verbosity_levels
      WHERE enabled = 1
      ORDER BY name
      `,
    )
    .all();
}

export function getVerbosityLevelById(levelId) {
  return db
    .prepare(
      `
      SELECT
        id AS levelId,
        name,
        description,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM verbosity_levels
      WHERE id = ?
      `,
    )
    .get(levelId);
}

export function upsertVerbosityLevel({ levelId, name, description }) {
  db.prepare(
    `
    INSERT INTO verbosity_levels (
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

  return getVerbosityLevelById(levelId);
}

export function createDefaultVerbosityLevels() {
  defaultVerbosityLevels.forEach((level) => {
    upsertVerbosityLevel(level);
  });
}
