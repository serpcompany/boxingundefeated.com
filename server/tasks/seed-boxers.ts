import { promises as fs } from 'fs'
import { join } from 'path'

export async function seedBoxers() {
  console.log('Seeding boxers table…')

  const db = useD1Database()
  
  // Execute all boxer seed SQL files in order
  const seedFiles = [
    '0005_seed-boxers-part1.sql',
    '0006_seed-boxers-part2.sql',
    '0007_seed-boxers-part3.sql',
    '0008_seed-boxers-part4.sql',
    '0009_seed-boxers-part5.sql',
    '0010_seed-boxers-part6.sql',
    '0011_seed-boxers-part7.sql',
    '0012_seed-boxers-part8.sql',
    '0013_seed-boxers-part9.sql',
    '0014_seed-boxers-part10.sql',
    '0015_seed-boxers-part11.sql'
  ]
  
  for (const file of seedFiles) {
    const migrationPath = join(process.cwd(), 'database/migrations', file)
    const sqlContent = await fs.readFile(migrationPath, 'utf-8')
    await db.exec(sqlContent)
    console.log(`Executed ${file}`)
  }
  
  // Get count of inserted boxers
  const result = await db.prepare('SELECT COUNT(*) as count FROM boxers').first()
  const count = result?.count || 0

  return { result: 'success', count }
}

export default defineTask({
  meta: {
    name: 'db:seed-boxers',
    description: 'Seed the boxers table with BoxRec data'
  },
  async run() {
    return seedBoxers()
  },
})