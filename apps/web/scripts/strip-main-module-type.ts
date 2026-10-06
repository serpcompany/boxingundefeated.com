/**
 * The second step of `pnpm cf-typegen`: removes the `mainModule` type that `wrangler types` adds to
 * cloudflare-env.d.ts. See lib/cloudflare-env-types.ts for why.
 */
import fs from 'node:fs'
import path from 'node:path'
import { stripMainModuleType } from '../lib/cloudflare-env-types'

const file = path.join(process.cwd(), 'cloudflare-env.d.ts')
const source = fs.readFileSync(file, 'utf8')
const stripped = stripMainModuleType(source)

if (stripped !== source) {
  fs.writeFileSync(file, stripped)
  console.log('Removed GlobalProps.mainModule from cloudflare-env.d.ts')
}
