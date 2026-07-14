import {
  pgTable,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const aiModels = pgTable("ai_models", {
  modelId: text("id").primaryKey(),

  name: text("name").notNull(),
  provider: text("provider").notNull(),
  description: text("description").notNull(),

  enabled: boolean("enabled").notNull().default(true),

  supportsTemperature: boolean("supports_temperature")
    .notNull()
    .default(false),

  supportsReasoning: boolean("supports_reasoning")
    .notNull()
    .default(false),

  supportsVerbosity: boolean("supports_verbosity")
    .notNull()
    .default(false),

  supportsStreaming: boolean("supports_streaming")
    .notNull()
    .default(false),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});
