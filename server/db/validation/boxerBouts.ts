// import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
// import { boxerBouts } from '../schema'
// import { z } from 'zod'

// // Schema for selecting a boxer bout - validates API responses
// export const boxerBoutSelectSchema = createSelectSchema(boxerBouts)

// // Schema for inserting a boxer bout - validates API requests
// export const boxerBoutInsertSchema = createInsertSchema(boxerBouts, {
//   // Custom validations
//   boxerId: z.string().min(1, 'Boxer ID is required'),
//   boutDate: z.string().min(1, 'Bout date is required'), // ISO date string
//   opponentName: z.string().min(1, 'Opponent name is required'),
//   result: z.enum(['win', 'loss', 'draw', 'no-contest'], {
//     required_error: 'Result is required',
//     invalid_type_error: 'Result must be win, loss, draw, or no-contest',
//   }),
//   resultMethod: z.enum(['ko', 'tko', 'decision', 'dq', 'rtd']).optional(),
//   resultRound: z.number().min(1).optional(),
//   numRoundsScheduled: z.number().min(1).optional(),
//   titleFight: z.boolean().default(false),
//   // URL validations
//   eventPageLink: z.string().url().optional().or(z.literal('')),
//   boutPageLink: z.string().url().optional().or(z.literal('')),
//   scorecardsPageLink: z.string().url().optional().or(z.literal('')),
// })

// // Schema for updating a boxer bout - validates API requests (all fields optional except id)
// export const boxerBoutUpdateSchema = createUpdateSchema(boxerBouts, {
//   // Custom validations for updates
//   boutDate: z.string().min(1, 'Bout date is required').optional(),
//   opponentName: z.string().min(1, 'Opponent name is required').optional(),
//   result: z.enum(['win', 'loss', 'draw', 'no-contest']).optional(),
//   resultMethod: z.enum(['ko', 'tko', 'decision', 'dq', 'rtd']).optional(),
//   resultRound: z.number().min(1).optional(),
//   numRoundsScheduled: z.number().min(1).optional(),
//   titleFight: z.boolean().optional(),
//   // URL validations
//   eventPageLink: z.string().url().optional().or(z.literal('')),
//   boutPageLink: z.string().url().optional().or(z.literal('')),
//   scorecardsPageLink: z.string().url().optional().or(z.literal('')),
// })

// // Schema for filtering boxer bouts (query parameters)
// export const boxerBoutFilterSchema = z.object({
//   boxerId: z.string().optional(),
//   result: z.enum(['win', 'loss', 'draw', 'no-contest']).optional(),
//   titleFight: z.boolean().optional(),
//   limit: z.number().min(1).max(100).default(20).optional(),
//   offset: z.number().min(0).default(0).optional(),
// })

// // TypeScript types inferred from Zod schemas
// export type BoxerBoutSelect = z.infer<typeof boxerBoutSelectSchema>
// export type BoxerBoutInsert = z.infer<typeof boxerBoutInsertSchema>
// export type BoxerBoutUpdate = z.infer<typeof boxerBoutUpdateSchema>
// export type BoxerBoutFilter = z.infer<typeof boxerBoutFilterSchema>