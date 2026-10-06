#!/usr/bin/env node

const fs = require('node:fs').promises
const path = require('node:path')
const { z } = require('zod')

// CLI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

const log = {
  error: msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: msg => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: msg => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: msg => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  header: msg => console.log(`\n${colors.blue}═══ ${msg} ═══${colors.reset}\n`)
}

// Simplified pipeline schema for validation
const PipelineBoxerSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(val => {
    if (typeof val === 'string') {
      return Number.parseInt(val.split('.')[0], 10)
    }
    return typeof val === 'number' ? val : Number.parseInt(val, 10)
  }),
  boxrecId: z.string().min(1),
  boxrecUrl: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  boxrecWikiUrl: z.string().nullable().optional(),
  birthName: z.string().nullable().optional(),
  nicknames: z.string().nullable().optional(),
  avatarImage: z.string().nullable().optional(),
  residence: z.string().nullable().optional(),
  birthPlace: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  height: z.string().nullable().optional(),
  reach: z.string().nullable().optional(),
  stance: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  promoters: z.string().nullable().optional(),
  trainers: z.string().nullable().optional(),
  managers: z.string().nullable().optional(),
  gym: z.string().nullable().optional(),
  proDebutDate: z.string().nullable().optional(),
  proDivision: z.string().nullable().optional(),
  proWins: z.number().default(0),
  proWinsByKnockout: z.number().default(0),
  proLosses: z.number().default(0),
  proLossesByKnockout: z.number().default(0),
  proDraws: z.number().default(0),
  proStatus: z.string().nullable().optional(),
  proTotalBouts: z.number().nullable().optional(),
  proTotalRounds: z.number().nullable().optional(),
  amateurDebutDate: z
    .union([z.string(), z.null()])
    .transform(v => v || null)
    .optional(),
  amateurDivision: z
    .union([z.string(), z.null()])
    .transform(v => v || null)
    .optional(),
  amateurWins: z.number().nullable().optional(),
  amateurWinsByKnockout: z.number().nullable().optional(),
  amateurLosses: z.number().nullable().optional(),
  amateurLossesByKnockout: z.number().nullable().optional(),
  amateurDraws: z.number().nullable().optional(),
  amateurStatus: z.string().nullable().optional(),
  amateurTotalBouts: z.number().nullable().optional(),
  amateurTotalRounds: z.number().nullable().optional(),
  bouts: z
    .union([
      z.string(),
      z.array(
        z
          .object({
            boxerId: z.string(),
            boutDate: z.string(),
            opponentName: z.string(),
            result: z.string().nullable().optional()
          })
          .passthrough()
      )
    ])
    .optional()
})

async function validateFile(filePath) {
  log.header('Validation Report')

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(content)

    const boxers = Array.isArray(data) ? data : [data]

    const stats = {
      total: boxers.length,
      valid: 0,
      invalid: 0,
      warnings: 0,
      errors: []
    }

    for (let i = 0; i < boxers.length; i++) {
      const boxer = boxers[i]

      try {
        // Check pipeline compatibility
        PipelineBoxerSchema.parse(boxer)
        stats.valid++
      } catch (e) {
        stats.invalid++
        if (i < 5) {
          // Show first 5 errors
          stats.errors.push({
            index: i,
            name: boxer.name || 'Unknown',
            errors: e.errors
              ? e.errors.map(err => `${err.path.join('.')}: ${err.message}`)
              : [e.message]
          })
        }
      }

      // Check for warnings
      if (!boxer.boxrecId || boxer.boxrecId.startsWith('generated-')) {
        stats.warnings++
      }
    }

    // Display results
    console.log(`Total records: ${stats.total}`)
    console.log(`Valid: ${colors.green}${stats.valid}${colors.reset}`)
    console.log(`Invalid: ${colors.red}${stats.invalid}${colors.reset}`)
    console.log(`With warnings: ${colors.yellow}${stats.warnings}${colors.reset}`)

    if (stats.errors.length > 0) {
      log.header('Sample Errors')
      stats.errors.forEach(item => {
        console.log(`\nRecord ${item.index} (${item.name}):`)
        item.errors.forEach(e => {
          log.error(`  ${e}`)
        })
      })
    }

    // Check schema differences
    if (boxers.length > 0) {
      log.header('Schema Analysis')
      const sample = boxers[0]

      // Check for current prod format
      const hasStringBouts = typeof sample.bouts === 'string'
      const hasEmptyStrings = sample.amateurDebutDate === ''
      const hasDecimalId = typeof sample.id === 'string' && sample.id.includes('.')

      if (hasStringBouts) {
        log.info('Bouts field is stringified JSON (current prod format)')
      } else if (Array.isArray(sample.bouts)) {
        log.info('Bouts field is array (new pipeline format)')
      }

      if (hasEmptyStrings) {
        log.warning('Found empty strings in amateur fields (should be null for pipeline)')
      }

      if (hasDecimalId) {
        log.warning('ID contains decimal (will be converted to integer for pipeline)')
      }
    }

    return stats
  } catch (error) {
    log.error(`Failed to read file: ${error.message}`)
    process.exit(1)
  }
}

async function prepareForPipeline(inputPath, outputPath) {
  log.header('Preparing Data for Pipeline')

  try {
    const content = await fs.readFile(inputPath, 'utf-8')
    const data = JSON.parse(content)
    const boxers = Array.isArray(data) ? data : [data]

    const prepared = boxers.map(boxer => {
      // Fix ID
      if (typeof boxer.id === 'string') {
        boxer.id = Number.parseInt(boxer.id.split('.')[0], 10)
      }

      // Ensure required fields
      if (!boxer.boxrecId) {
        boxer.boxrecId = `generated-${boxer.slug || 'unknown'}`
      }
      if (!boxer.boxrecUrl) {
        boxer.boxrecUrl = `https://boxrec.com/en/box-pro/${boxer.boxrecId}`
      }

      // Convert empty strings to null
      if (boxer.amateurDebutDate === '') boxer.amateurDebutDate = null
      if (boxer.amateurDivision === '') boxer.amateurDivision = null
      if (boxer.amateurStatus === '') boxer.amateurStatus = null

      // Stringify bouts if array
      if (Array.isArray(boxer.bouts)) {
        boxer.bouts = JSON.stringify(boxer.bouts)
      }

      return boxer
    })

    await fs.writeFile(outputPath, JSON.stringify(prepared, null, 2))
    log.success(`Pipeline-ready data written to: ${outputPath}`)
  } catch (error) {
    log.error(`Failed to prepare data: ${error.message}`)
    process.exit(1)
  }
}

async function compareFiles(file1, file2) {
  log.header('Schema Comparison')

  try {
    const data1 = JSON.parse(await fs.readFile(file1, 'utf-8'))
    const data2 = JSON.parse(await fs.readFile(file2, 'utf-8'))

    const sample1 = Array.isArray(data1) ? data1[0] : data1
    const sample2 = Array.isArray(data2) ? data2[0] : data2

    const fields1 = new Set(Object.keys(sample1))
    const fields2 = new Set(Object.keys(sample2))

    const onlyIn1 = [...fields1].filter(f => !fields2.has(f))
    const onlyIn2 = [...fields2].filter(f => !fields1.has(f))
    const common = [...fields1].filter(f => fields2.has(f))

    if (onlyIn1.length > 0) {
      console.log('\nFields only in first file:')
      onlyIn1.forEach(f => {
        console.log(`  - ${f}`)
      })
    }

    if (onlyIn2.length > 0) {
      console.log('\nFields only in second file:')
      onlyIn2.forEach(f => {
        console.log(`  + ${f}`)
      })
    }

    console.log('\nCommon fields with different types:')
    common.forEach(field => {
      const type1 = typeof sample1[field]
      const type2 = typeof sample2[field]
      if (type1 !== type2) {
        console.log(`  ${field}: ${type1} → ${type2}`)
      }
    })
  } catch (error) {
    log.error(`Failed to compare files: ${error.message}`)
    process.exit(1)
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'validate':
      if (!args[1]) {
        log.error('Usage: validate <file.json>')
        process.exit(1)
      }
      await validateFile(args[1])
      break

    case 'prepare':
      if (!args[1] || !args[2]) {
        log.error('Usage: prepare <input.json> <output.json>')
        process.exit(1)
      }
      await prepareForPipeline(args[1], args[2])
      break

    case 'compare':
      if (!args[1] || !args[2]) {
        log.error('Usage: compare <file1.json> <file2.json>')
        process.exit(1)
      }
      await compareFiles(args[1], args[2])
      break
    default:
      console.log(`
${colors.blue}Boxing Data Validator${colors.reset}

Commands:
  validate <file.json>         Validate boxer data and generate report
  prepare <in.json> <out.json> Prepare data for pipeline (auto-fix issues)
  compare <file1> <file2>      Compare schemas between two files
  help                         Show this help message

Examples:
  npm run validate-boxers validate apps/web/data/validate/boxers.json
  npm run validate-boxers prepare data/new.json data/pipeline-ready.json
  npm run validate-boxers compare data/old.json data/new.json
      `)
      break
  }
}

main().catch(error => {
  log.error(`Fatal error: ${error.message}`)
  process.exit(1)
})
