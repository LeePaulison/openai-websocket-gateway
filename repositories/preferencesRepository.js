import { db } from "../lib/db/sqlite.js";

export function getPreferencesByUserId(userId) {
  return db
    .prepare(
      `
      SELECT
        user_id AS userId,
        model,
        temperature,
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
    INSERT INTO preferences (
      user_id,
      model,
      temperature
    )
    VALUES (?, ?, ?)
    ON CONFLICT(user_id)
    DO NOTHING
  `,
  ).run(userId, "gpt-4.1-mini", 0.7);

  return getPreferencesByUserId(userId);
}

export function updatePreferences({ userId, model, temperature }) {
  db.prepare(
    `
    INSERT INTO preferences (
      user_id,
      model,
      temperature
    )
    VALUES (?, ?, ?)
    ON CONFLICT(user_id)
    DO UPDATE SET
      model = excluded.model,
      temperature = excluded.temperature,
      updated_at = CURRENT_TIMESTAMP
  `,
  ).run(userId, model, temperature);

  return db
    .prepare(
      `
    SELECT
      user_id AS userId,
      model,
      temperature
    FROM preferences
    WHERE user_id = ?
  `,
    )
    .get(userId);
}
