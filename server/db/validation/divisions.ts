import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { divisions } from '../schema'
import { z } from 'zod'

// Schema for selecting a division - validates API responses
export const divisionSelectSchema = createSelectSchema(divisions)

// Schema for inserting a division - validates API requests
export const divisionInsertSchema = createInsertSchema(divisions, {
  // Custom validations
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1, 'Division name is required'),
  weightLimitPounds: z.number().min(0, 'Weight limit must be positive'),
  alternativeNames: z.string().optional(), // JSON string of alternative names
  description: z.string().optional(),
})

// Schema for updating a division - validates API requests (all fields optional)
export const divisionUpdateSchema = createUpdateSchema(divisions, {
  // Custom validations for updates
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  name: z.string().min(1, 'Division name is required').optional(),
  weightLimitPounds: z.number().min(0, 'Weight limit must be positive').optional(),
  alternativeNames: z.string().optional(),
  description: z.string().optional(),
})

// Helper schema for parsing alternative names JSON
export const alternativeNamesArraySchema = z.array(z.string()).optional()

// Schema for division with parsed alternative names (for API responses)
export const divisionWithParsedNamesSchema = divisionSelectSchema.extend({
  alternativeNames: alternativeNamesArraySchema,
})

// TypeScript types inferred from Zod schemas
export type DivisionSelect = z.infer<typeof divisionSelectSchema>
export type DivisionInsert = z.infer<typeof divisionInsertSchema>
export type DivisionUpdate = z.infer<typeof divisionUpdateSchema>
export type DivisionWithParsedNames = z.infer<typeof divisionWithParsedNamesSchema>