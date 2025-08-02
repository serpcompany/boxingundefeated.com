import { promises as fs } from 'fs'
import { join } from 'path'

export async function seedDivisions() {
  console.log('Seeding divisions table…')

  const db = useD1Database()
  
  // Read and execute the SQL migration file
  const migrationPath = join(process.cwd(), 'database/migrations/0004_seed-initial-data.sql')
  const sqlContent = await fs.readFile(migrationPath, 'utf-8')
  
  // Execute the SQL
  await db.exec(sqlContent)
  
  // Get count of inserted divisions
  const result = await db.prepare('SELECT COUNT(*) as count FROM divisions').first()
  const count = result?.count || 0

  return { result: 'success', count }
}

export default defineTask({
  meta: {
    name: 'db:seed-divisions',
    description: 'Populate the divisions table with boxing weight classes',
  },
  async run() {
    return seedDivisions()
  },
})