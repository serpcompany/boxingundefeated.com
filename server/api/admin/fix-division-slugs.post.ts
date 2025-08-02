import { useDrizzle, tables, sql } from '~/server/utils/drizzle'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const db = useDrizzle()
  
  try {
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
      const result = await db
        .update(tables.divisions)
        .set({ slug: newSlug })
        .where(sql`${tables.divisions.slug} = ${oldSlug}`)
        .run()
      
      if (result.meta.changes > 0) {
        updatedCount += result.meta.changes
      }
    }

    // Get all divisions to verify the update
    const divisions = await db
      .select({ id: tables.divisions.id, slug: tables.divisions.slug, name: tables.divisions.name })
      .from(tables.divisions)
      .orderBy(tables.divisions.id)
      .all()

    return {
      success: true,
      updatedCount,
      divisions,
      message: `Successfully updated ${updatedCount} division slugs to use hyphenated format`
    }
  } catch (error) {
    console.error('Error updating division slugs:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update division slugs'
    })
  }
})