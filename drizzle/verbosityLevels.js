import {
  pgTable,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const verbosityLevels = pgTable("verbosity_levels", {
  levelId: text("id").primaryKey(),

  name: text("name").notNull(),
  description: text("description").notNull(),

  enabled: boolean("enabled").notNull().default(true),

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
