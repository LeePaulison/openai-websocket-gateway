import { db } from "../lib/db/sqlite.js";

export function getPreferencesByUserId(userId) {
  return db
    .prepare(
      `
      SELECT
        user_id AS userId,
        theme,
        default_model_id AS defaultModelId,
        temperature,
        default_agent_id AS defaultAgentId,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM preferences
      WHERE user_id = ?    `,
    )
    .get(userId);
}

export function createPreferences(userId) {
  db.prepare(
    `
    INSERT INTO preferences (user_id)
    VALUES (?)
    ON CONFLICT(user_id)
    DO NOTHING
  `,
  ).run(userId);

  return getPreferencesByUserId(userId);
}

export function updatePreferences({
  userId,
  theme,
  defaultModelId,
  temperature,
  defaultAgentId,
}) {
  db.prepare(
    `
    INSERT INTO preferences (
      user_id,
      theme,
      default_model_id,
      temperature,
      default_agent_id
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id)
    DO UPDATE SET
      theme = excluded.theme,
      default_model_id = excluded.default_model_id,
      temperature = excluded.temperature,
      default_agent_id = excluded.default_agent_id,
      updated_at = CURRENT_TIMESTAMP
  `,
  ).run(userId, theme, defaultModelId, temperature, defaultAgentId);

  const updatedPreferences = getPreferencesByUserId(userId);

  console.log(updatedPreferences);

  return updatedPreferences;
}
