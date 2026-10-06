import type { bouts, boxers, datasetState, divisions } from './schema'

export type Boxer = typeof boxers.$inferSelect
export type NewBoxer = typeof boxers.$inferInsert
export type Bout = typeof bouts.$inferSelect
export type NewBout = typeof bouts.$inferInsert
export type Division = typeof divisions.$inferSelect
export type NewDivision = typeof divisions.$inferInsert
export type DatasetState = typeof datasetState.$inferSelect
