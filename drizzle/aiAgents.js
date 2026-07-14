import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const aiAgents = pgTable("ai_agents", {
  agentId: text("id").primaryKey(),

  category: text("category").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),

  systemPrompt: text("system_prompt").notNull(),

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
