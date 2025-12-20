import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We primarily fetch from external API, but we'll keep a users table for convention
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// === Streak API Schemas ===

// Minimal schema based on Streak API docs/expectations
export const pipelineSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  creationDate: z.number().optional(),
  lastUpdatedTimestamp: z.number().optional(),
});

export const stageSchema = z.object({
  key: z.string(),
  name: z.string(),
});

// Enriched pipeline with stages map for easier frontend consumption
export const pipelineWithStagesSchema = pipelineSchema.extend({
  stages: z.record(z.string(), stageSchema).optional(),
  fields: z.array(z.any()).optional(),
});

export const boxSchema = z.object({
  key: z.string(),
  name: z.string(),
  notes: z.string().nullable().optional(),
  stageKey: z.string().optional(),
  pipelineKey: z.string().optional(),
  lastUpdatedTimestamp: z.number().optional(),
  // Custom fields from Streak API (keyed by field key)
  [z.string()]: z.any().optional(),
}).passthrough();

// API Response Types
export type Pipeline = z.infer<typeof pipelineSchema>;
export type PipelineWithStages = z.infer<typeof pipelineWithStagesSchema>;
export type Box = z.infer<typeof boxSchema>;
export type Stage = z.infer<typeof stageSchema>;
