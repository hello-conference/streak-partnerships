import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { pgTable, serial, varchar, timestamp, text } from "drizzle-orm/pg-core";

// Export auth models for Replit Auth integration
export * from "./models/auth";

// === Email Log Table ===
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  org: varchar("org", { length: 10 }).notNull(),
  exhibitorId: varchar("exhibitor_id", { length: 50 }).notNull(),
  exhibitorName: varchar("exhibitor_name", { length: 255 }).notNull(),
  sentTo: varchar("sent_to", { length: 255 }).notNull(),
  sentBy: varchar("sent_by", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true, sentAt: true });
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

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

const contactSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export const boxSchema = z.object({
  key: z.string(),
  name: z.string(),
  notes: z.string().nullable().optional(),
  stageKey: z.string().optional(),
  pipelineKey: z.string().optional(),
  lastUpdatedTimestamp: z.number().optional(),
  fields: z.record(z.string(), z.any()).optional(),
  contacts: z.array(contactSchema).optional(),
}).passthrough();

// API Response Types
export type Pipeline = z.infer<typeof pipelineSchema>;
export type PipelineWithStages = z.infer<typeof pipelineWithStagesSchema>;
export type Box = z.infer<typeof boxSchema>;
export type Stage = z.infer<typeof stageSchema>;
