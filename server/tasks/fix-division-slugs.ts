import { useDrizzle, tables, sql } from '../utils/drizzle'

export async function fixDivisionSlugs() {
  console.log('Fixing division slugs to use hyphenated format...')

  const db = useDrizzle()

  // Update division slugs to use hyphenated format
  const updates = [
    { oldSlug: 'lightflyweight', newSlug: 'light-flyweight' },
    { oldSlug: 'superflyweight', newSlug: 'super-flyweight' },
    { oldSlug: 'superbantamweight', newSlug: 'super-bantamweight' },
    { oldSlug: 'superfeatherweight', newSlug: 'super-featherweight' },
    { oldSlug: 'superlightweight', newSlug: 'super-lightweight' },
    { oldSlug: 'superwelterweight', newSlug: 'super-welterweight' },
    { oldSlug: 'supermiddleweight', newSlug: 'super-middleweight' },
    { oldSlug: 'lightheavyweight', newSlug: 'light-heavyweight' },
  ]

  let updatedCount = 0
  
  for (const { oldSlug, newSlug } of updates) {
    console.log(`Updating ${oldSlug} → ${newSlug}`)
    
    const result = await db
      .update(tables.divisions)
      .set({ slug: newSlug, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(sql`${tables.divisions.slug} = ${oldSlug}`)
      .run()
    
    if (result.meta.changes > 0) {
      updatedCount += result.meta.changes
      console.log(`✓ Updated ${oldSlug} to ${newSlug}`)
    } else {
      console.log(`- No changes for ${oldSlug} (might already be correct)`)
    }
  }

  // Get all divisions to verify the update
  const divisions = await db
    .select({ id: tables.divisions.id, slug: tables.divisions.slug, name: tables.divisions.name })
    .from(tables.divisions)
    .orderBy(tables.divisions.id)
    .all()

  console.log('\nCurrent division slugs:')
  divisions.forEach(div => {
    console.log(`  ${div.id}: ${div.slug} (${div.name})`)
  })

  return { 
    result: 'success', 
    updatedCount,
    totalDivisions: divisions.length,
    message: `Updated ${updatedCount} division slugs to use hyphenated format`
  }
}

export default defineTask({
  meta: {
    name: 'db:fix-division-slugs',
    description: 'Fix division slugs to use hyphenated format (e.g., super-lightweight instead of superlightweight)',
  },
  async run() {
    return fixDivisionSlugs()
  },
})