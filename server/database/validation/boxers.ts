import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { boxers } from '../schema'
import { z } from 'zod'

// Schema for selecting a boxer - validates API responses
export const boxerSelectSchema = createSelectSchema(boxers)

// Schema for inserting a boxer - validates API requests
export const boxerInsertSchema = createInsertSchema(boxers, {
  // Custom validations - use callbacks to extend the base schema
  boxrecId: (schema) => schema.min(1, 'BoxRec ID is required'),
  boxrecUrl: (schema) => schema.url('Must be a valid URL'),
  boxrecWikiUrl: (schema) => schema.url('Must be a valid URL'),
  slug: (schema) => schema.min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: (schema) => schema.min(1, 'Name is required'),
  // Ensure numeric stats are non-negative
  proWins: (schema) => schema.min(0),
  proWinsByKnockout: (schema) => schema.min(0),
  proLosses: (schema) => schema.min(0),
  proLossesByKnockout: (schema) => schema.min(0),
  proDraws: (schema) => schema.min(0),
  proTotalBouts: (schema) => schema.min(0),
  proTotalRounds: (schema) => schema.min(0),
  amateurWins: (schema) => schema.min(0),
  amateurWinsByKnockout: (schema) => schema.min(0),
  amateurLosses: (schema) => schema.min(0),
  amateurLossesByKnockout: (schema) => schema.min(0),
  amateurDraws: (schema) => schema.min(0),
  amateurTotalBouts: (schema) => schema.min(0),
  amateurTotalRounds: (schema) => schema.min(0),
})

// Schema for updating a boxer - validates API requests (all fields optional)
export const boxerUpdateSchema = createUpdateSchema(boxers, {
  // Custom validations for updates
  boxrecUrl: z.string().url('Must be a valid URL').optional(),
  boxrecWikiUrl: z.string().url('Must be a valid URL').optional(),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  // Ensure numeric stats are non-negative when provided
  proWins: z.number().min(0).optional(),
  proWinsByKnockout: z.number().min(0).optional(),
  proLosses: z.number().min(0).optional(),
  proLossesByKnockout: z.number().min(0).optional(),
  proDraws: z.number().min(0).optional(),
  proTotalBouts: z.number().min(0).optional(),
  proTotalRounds: z.number().min(0).optional(),
  amateurWins: z.number().min(0).optional(),
  amateurWinsByKnockout: z.number().min(0).optional(),
  amateurLosses: z.number().min(0).optional(),
  amateurLossesByKnockout: z.number().min(0).optional(),
  amateurDraws: z.number().min(0).optional(),
  amateurTotalBouts: z.number().min(0).optional(),
  amateurTotalRounds: z.number().min(0).optional(),
})

// TypeScript types inferred from Zod schemas
export type BoxerSelect = z.infer<typeof boxerSelectSchema>
export type BoxerInsert = z.infer<typeof boxerInsertSchema>
export type BoxerUpdate = z.infer<typeof boxerUpdateSchema>