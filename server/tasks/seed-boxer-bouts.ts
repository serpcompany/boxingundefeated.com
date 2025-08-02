export async function seedBoxerBouts() {
  console.log('Seeding boxerBouts table…')

  // For now, we don't have boxer bouts data in SQL migrations
  // This would be populated from actual data files when available
  
  const db = hubDatabase()
  
  // Get count of boxer bouts (should be 0 for now)
  const result = await db.prepare('SELECT COUNT(*) as count FROM boxerBouts').first()
  const count = result?.count || 0

  return { result: 'success', count }
}

export default defineTask({
  meta: {
    name: 'db:seed-boxer-bouts',
    description: 'Seed the boxerBouts table with BoxRec bout data'
  },
  async run() {
    return seedBoxerBouts()
  }
})