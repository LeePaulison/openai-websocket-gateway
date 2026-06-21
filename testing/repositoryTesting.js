import {
  createPreferences,
  getPreferencesByUserId,
  updatePreferences,
} from "../repositories/preferencesRepository.js";

export function testPreferencesRepository() {
  const userId = "test-user";

  console.log("\n=== CREATE ===");

  const created = createPreferences(userId);

  console.log(created);

  console.log("\n=== GET ===");

  const fetched = getPreferencesByUserId(userId);

  console.log(fetched);

  console.log("\n=== UPDATE ===");

  const updated = updatePreferences({
    userId,
    model: "gpt-4.1",
    temperature: 0.9,
  });

  console.log(updated);

  console.log("\n=== UNIQUE ===");

  const unique = createPreferences(userId);

  console.log(unique);
}
