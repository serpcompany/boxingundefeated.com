import { relations, sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

// Value sets observed across all 5,571 records of `from-pipeline/boxers.json`. They type the
// columns in TypeScript only: SQLite can't change a CHECK constraint without rebuilding the table,
// so the importer validates them instead.
export const GENDERS = ['M', 'F'] as const
export const STANCES = ['orthodox', 'southpaw'] as const
export const PRO_STATUSES = ['active', 'inactive'] as const
// `N` (no decision), `VS` (scheduled, not yet fought) and `?` come from BoxRec as-is.
export const BOUT_RESULTS = ['win', 'loss', 'draw', 'N', 'VS', '?'] as const

const currentTimestamp = sql`CURRENT_TIMESTAMP`
const emptyJsonArray = sql`'[]'`

/** The 17 weight classes. `pro_division` is the value boxers carry, such as `light heavy`. */
export const divisions = sqliteTable(
  'divisions',
  {
    slug: text('slug').primaryKey(),
    name: text('name').notNull(),
    proDivision: text('pro_division').notNull(),
    sortOrder: integer('sort_order').notNull()
  },
  table => [
    uniqueIndex('divisions_pro_division_unique').on(table.proDivision),
    uniqueIndex('divisions_sort_order_unique').on(table.sortOrder)
  ]
)

export const boxers = sqliteTable(
  'boxers',
  {
    // The pipeline's numeric id, kept as the INTEGER PRIMARY KEY (the rowid).
    id: integer('id').primaryKey(),
    boxrecId: text('boxrec_id').notNull(),
    boxrecUrl: text('boxrec_url').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    birthName: text('birth_name'),
    // One string per boxer, quoted in the source (`"The Hammer"`), with mixed separators.
    nicknames: text('nicknames'),
    avatarImage: text('avatar_image'),
    residence: text('residence'),
    birthPlace: text('birth_place'),
    // Free text in the source; most non-null values are not dates.
    dateOfBirth: text('date_of_birth'),
    gender: text('gender', { enum: GENDERS }),
    nationality: text('nationality'),
    // Digits as text, as in the source: centimetres and inches.
    height: text('height'),
    reach: text('reach'),
    stance: text('stance', { enum: STANCES }),
    // Trusted HTML.
    bio: text('bio'),
    // Newline-separated names in the source, stored as JSON arrays.
    promoters: text('promoters', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(emptyJsonArray),
    trainers: text('trainers', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(emptyJsonArray),
    managers: text('managers', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(emptyJsonArray),
    gym: text('gym'),
    // YYYY-MM-DD.
    proDebutDate: text('pro_debut_date'),
    proDivision: text('pro_division').references(() => divisions.proDivision, {
      onUpdate: 'cascade'
    }),
    proWins: integer('pro_wins').notNull().default(0),
    proWinsByKnockout: integer('pro_wins_by_knockout').notNull().default(0),
    proLosses: integer('pro_losses').notNull().default(0),
    proLossesByKnockout: integer('pro_losses_by_knockout').notNull().default(0),
    proDraws: integer('pro_draws').notNull().default(0),
    proTotalBouts: integer('pro_total_bouts').notNull().default(0),
    proTotalRounds: integer('pro_total_rounds'),
    proStatus: text('pro_status', { enum: PRO_STATUSES }),
    // The pipeline's own timestamps (ISO 8601 without a zone), copied verbatim.
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),
    // When an import last changed what this boxer's page shows: the row, its bouts or their
    // opponent links. Unchanged boxers keep theirs.
    importedAt: text('imported_at').notNull().default(currentTimestamp)
  },
  table => [
    uniqueIndex('boxers_boxrec_id_unique').on(table.boxrecId),
    uniqueIndex('boxers_slug_unique').on(table.slug),
    // `/boxers/` and the homepage's top fighters: wins, then bouts, then name.
    index('boxers_directory_idx').on(
      sql`${table.proWins} DESC`,
      sql`${table.proTotalBouts} DESC`,
      sql`${table.name} COLLATE NOCASE`
    ),
    // `/divisions/<division>/`, in the same order. Also serves the division foreign key.
    index('boxers_division_directory_idx').on(
      table.proDivision,
      sql`${table.proWins} DESC`,
      sql`${table.proTotalBouts} DESC`,
      sql`${table.name} COLLATE NOCASE`
    ),
    check(
      'boxers_record_nonnegative',
      sql`${table.proWins} >= 0 AND ${table.proWinsByKnockout} >= 0 AND ${table.proLosses} >= 0 AND ${table.proLossesByKnockout} >= 0 AND ${table.proDraws} >= 0 AND ${table.proTotalBouts} >= 0`
    )
  ]
)

/** One row per entry in a boxer's record, so a bout between two listed boxers appears twice. */
export const bouts = sqliteTable(
  'bouts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    boxerId: integer('boxer_id')
      .notNull()
      .references(() => boxers.id, { onDelete: 'cascade' }),
    // Position in the source `bouts` array. The source order is not chronological.
    ordinal: integer('ordinal').notNull(),
    // The bout's BoxRec id, the last segment of `bout_page_link`.
    boxrecId: text('boxrec_id').notNull(),
    // `Mon YY` or YYYY-MM-DD, verbatim.
    boutDate: text('bout_date').notNull(),
    opponentName: text('opponent_name').notNull(),
    // The opponent's profile, when they are in the dataset.
    opponentBoxerId: integer('opponent_boxer_id').references(() => boxers.id, {
      onDelete: 'set null'
    }),
    opponentWeight: text('opponent_weight'),
    opponentRecord: text('opponent_record'),
    eventName: text('event_name'),
    refereeName: text('referee_name'),
    judge1Name: text('judge1_name'),
    judge1Score: text('judge1_score'),
    judge2Name: text('judge2_name'),
    judge2Score: text('judge2_score'),
    judge3Name: text('judge3_name'),
    judge3Score: text('judge3_score'),
    numRoundsScheduled: integer('num_rounds_scheduled'),
    result: text('result', { enum: BOUT_RESULTS }).notNull(),
    resultMethod: text('result_method'),
    resultRound: text('result_round'),
    eventPageLink: text('event_page_link'),
    boutPageLink: text('bout_page_link').notNull(),
    scorecardsPageLink: text('scorecards_page_link'),
    titleFight: integer('title_fight', { mode: 'boolean' }).notNull().default(false)
  },
  table => [
    // A profile's fight history, in source order.
    uniqueIndex('bouts_boxer_ordinal_unique').on(table.boxerId, table.ordinal),
    // Opponent lookups, and the foreign key's ON DELETE SET NULL.
    index('bouts_opponent_boxer_id_idx').on(table.opponentBoxerId),
    check('bouts_ordinal_nonnegative', sql`${table.ordinal} >= 0`),
    check('bouts_title_fight_boolean', sql`${table.titleFight} IN (0, 1)`)
  ]
)

export const divisionsRelations = relations(divisions, ({ many }) => ({
  boxers: many(boxers)
}))

export const boxersRelations = relations(boxers, ({ many, one }) => ({
  division: one(divisions, {
    fields: [boxers.proDivision],
    references: [divisions.proDivision]
  }),
  bouts: many(bouts, { relationName: 'boxer_bouts' }),
  boutsAsOpponent: many(bouts, { relationName: 'opponent_bouts' })
}))

export const boutsRelations = relations(bouts, ({ one }) => ({
  boxer: one(boxers, {
    fields: [bouts.boxerId],
    references: [boxers.id],
    relationName: 'boxer_bouts'
  }),
  opponent: one(boxers, {
    fields: [bouts.opponentBoxerId],
    references: [boxers.id],
    relationName: 'opponent_bouts'
  })
}))
