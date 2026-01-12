import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export auth models for Replit Auth integration
export * from "./models/auth";

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
