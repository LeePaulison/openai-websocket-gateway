import {
  pgTable,
  text,
  real,
  timestamp,
} from "drizzle-orm/pg-core";

export const preferences = pgTable("preferences", {
  userId: text("user_id").primaryKey(),

  theme: text("theme").notNull().default("dark"),

  defaultModelId: text("default_model_id")
    .notNull()
    .default("gpt-4.1-mini"),

  temperature: real("temperature")
    .notNull()
    .default(0.7),

  defaultReasoningId: text("default_reasoning_id")
    .notNull()
    .default("medium"),

  defaultVerbosityId: text("default_verbosity_id")
    .notNull()
    .default("medium"),

  defaultAgentId: text("default_agent_id")
    .notNull()
    .default("assistant"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).defaultNow(),
});
