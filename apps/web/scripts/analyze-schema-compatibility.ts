#!/usr/bin/env npx tsx

import fs from 'node:fs'
import path from 'node:path'

// Load the JSON data
const jsonPath = path.join(process.cwd(), 'apps/web/data/pipeline/boxers.json')
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

// Schema fields from the SQLite table
const schemaFields = {
  required: [
    'boxrecId',
    'boxrecUrl',
    'slug',
    'name',
    'proWins',
    'proWinsByKnockout',
    'proLosses',
    'proLossesByKnockout',
    'proDraws',
    'createdAt',
    'updatedAt'
  ],
  optional: [
    'id',
    'boxrecWikiUrl',
    'birthName',
    'nicknames',
    'avatarImage',
    'residence',
    'birthPlace',
    'dateOfBirth',
    'gender',
    'nationality',
    'height',
    'reach',
    'stance',
    'bio',
    'promoters',
    'trainers',
    'managers',
    'gym',
    'proDebutDate',
    'proDivision',
    'proStatus',
    'proTotalBouts',
    'proTotalRounds',
    'amateurDebutDate',
    'amateurDivision',
    'amateurWins',
    'amateurWinsByKnockout',
    'amateurLosses',
    'amateurLossesByKnockout',
    'amateurDraws',
    'amateurStatus',
    'amateurTotalBouts',
    'amateurTotalRounds',
    'bouts'
  ],
  jsonFields: ['promoters', 'trainers', 'managers', 'bouts'],
  integerFields: [
    'id',
    'proWins',
    'proWinsByKnockout',
    'proLosses',
    'proLossesByKnockout',
    'proDraws',
    'proTotalBouts',
    'proTotalRounds',
    'amateurWins',
    'amateurWinsByKnockout',
    'amateurLosses',
    'amateurLossesByKnockout',
    'amateurDraws',
    'amateurTotalBouts',
    'amateurTotalRounds'
  ]
}

console.log('=== Boxing Data Pipeline Schema Analysis ===\n')
console.log(`Total boxers in JSON: ${jsonData.length}`)
console.log(`Sample size for analysis: ${Math.min(100, jsonData.length)} boxers\n`)

// Analyze field presence and types
const fieldAnalysis: Record<
  string,
  {
    present: number
    nullCount: number
    emptyCount: number
    types: Set<string>
    sampleValues: any[]
  }
> = {}

// Get all unique fields from JSON
const allJsonFields = new Set<string>()
jsonData.slice(0, 100).forEach((boxer: any) => {
  Object.keys(boxer).forEach(key => {
    allJsonFields.add(key)
  })
})

// Initialize analysis for all fields
allJsonFields.forEach(field => {
  fieldAnalysis[field] = {
    present: 0,
    nullCount: 0,
    emptyCount: 0,
    types: new Set(),
    sampleValues: []
  }
})

// Analyze each boxer
jsonData.slice(0, 100).forEach((boxer: any) => {
  allJsonFields.forEach(field => {
    if (field in boxer) {
      fieldAnalysis[field].present++
      const value = boxer[field]

      if (value === null) {
        fieldAnalysis[field].nullCount++
      } else if (value === '') {
        fieldAnalysis[field].emptyCount++
      } else {
        fieldAnalysis[field].types.add(typeof value)
        if (fieldAnalysis[field].sampleValues.length < 3) {
          if (typeof value === 'object') {
            fieldAnalysis[field].sampleValues.push(`${JSON.stringify(value).slice(0, 50)}...`)
          } else {
            fieldAnalysis[field].sampleValues.push(value)
          }
        }
      }
    }
  })
})

// Check schema compatibility
console.log('=== SCHEMA COMPATIBILITY CHECK ===\n')

console.log('Required Fields (must be NOT NULL):')
schemaFields.required.forEach(field => {
  const analysis = fieldAnalysis[field]
  if (!analysis) {
    console.log(`  ❌ ${field}: MISSING FROM JSON`)
  } else {
    const hasNulls = analysis.nullCount > 0 || analysis.emptyCount > 0
    const status = hasNulls ? '⚠️' : '✅'
    console.log(
      `  ${status} ${field}: ${analysis.present}/${100} present, ${analysis.nullCount} nulls, ${analysis.emptyCount} empty`
    )
  }
})

console.log('\nOptional Fields:')
schemaFields.optional.forEach(field => {
  const analysis = fieldAnalysis[field]
  if (!analysis) {
    console.log(`  ❌ ${field}: MISSING FROM JSON`)
  } else {
    console.log(
      `  ✅ ${field}: ${analysis.present}/${100} present, ${analysis.nullCount} nulls, ${analysis.emptyCount} empty`
    )
  }
})

console.log('\n=== DATA TYPE VALIDATION ===\n')

console.log('Integer Fields:')
schemaFields.integerFields.forEach(field => {
  const analysis = fieldAnalysis[field]
  if (analysis) {
    const hasNonNumbers = Array.from(analysis.types).some(t => t !== 'number')
    const status = hasNonNumbers ? '⚠️' : '✅'
    console.log(`  ${status} ${field}: types: ${Array.from(analysis.types).join(', ')}`)
  }
})

console.log('\nJSON/Array Fields (should be serializable):')
schemaFields.jsonFields.forEach(field => {
  const analysis = fieldAnalysis[field]
  if (analysis) {
    const types = Array.from(analysis.types)
    console.log(`  ${field}: types: ${types.join(', ')}`)
    if (analysis.sampleValues.length > 0) {
      console.log(`    Sample: ${analysis.sampleValues[0]}`)
    }
  }
})

console.log('\n=== FIELDS IN JSON BUT NOT IN SCHEMA ===\n')
const schemaFieldSet = new Set([...schemaFields.required, ...schemaFields.optional])
const extraFields = Array.from(allJsonFields).filter(f => !schemaFieldSet.has(f))
if (extraFields.length > 0) {
  extraFields.forEach(field => {
    const analysis = fieldAnalysis[field]
    console.log(`  ⚠️ ${field}: ${analysis.present}/${100} present`)
  })
} else {
  console.log('  ✅ No extra fields found')
}

console.log('\n=== DATA QUALITY ISSUES ===\n')

// Check for critical issues
const issues: string[] = []

// Check required fields for nulls
schemaFields.required.forEach(field => {
  const analysis = fieldAnalysis[field]
  if (analysis && (analysis.nullCount > 0 || analysis.emptyCount > 0)) {
    issues.push(
      `Required field "${field}" has ${analysis.nullCount} nulls and ${analysis.emptyCount} empty values`
    )
  }
})

// Check date formats
const dateFields = ['dateOfBirth', 'proDebutDate', 'amateurDebutDate']
dateFields.forEach(field => {
  const analysis = fieldAnalysis[field]
  if (analysis && analysis.sampleValues.length > 0) {
    const sample = analysis.sampleValues[0]
    if (sample && typeof sample === 'string' && !sample.match(/^\d{4}-\d{2}-\d{2}$/)) {
      issues.push(`Date field "${field}" may have non-standard format: ${sample}`)
    }
  }
})

if (issues.length > 0) {
  console.log('Issues found:')
  issues.forEach(issue => {
    console.log(`  ⚠️ ${issue}`)
  })
} else {
  console.log('  ✅ No critical data quality issues found')
}

console.log('\n=== RECOMMENDATIONS ===\n')

console.log('1. Data Migration Considerations:')
console.log('   - Handle timestamps: JSON has "createdAt" and "updatedAt" that may need defaults')
console.log('   - Array fields (promoters, trainers, managers) need JSON serialization')
console.log('   - The "bouts" field contains complex nested data that needs proper JSON handling')
console.log('   - Empty strings should be converted to NULL for optional fields')

console.log('\n2. Schema Adjustments Needed:')
if (!fieldAnalysis.createdAt || !fieldAnalysis.updatedAt) {
  console.log('   - Add default timestamps for createdAt/updatedAt during import')
}

console.log('\n3. Data Transformation Required:')
console.log('   - Convert empty strings to NULL for database consistency')
console.log('   - Ensure integer fields are properly typed (not strings)')
console.log('   - Serialize array/object fields to JSON strings for SQLite storage')

console.log('\n=== SUMMARY ===\n')
const canImport = !issues.some(issue => issue.includes('Required field'))
if (canImport) {
  console.log('✅ The JSON data is COMPATIBLE with the schema with minor transformations')
} else {
  console.log('⚠️ The JSON data needs FIXES before import - see issues above')
}
