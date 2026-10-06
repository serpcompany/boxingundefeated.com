/**
 * @jest-environment node
 */
import fs from 'node:fs'
import path from 'node:path'
import { stripMainModuleType } from './cloudflare-env-types'

const generated = `declare namespace Cloudflare {
\tinterface GlobalProps {
\t\tmainModule: typeof import("./worker");
\t}
\tinterface StagingEnv {
\t\tSITE_ENVIRONMENT: "staging";
\t}
}
`

describe('stripMainModuleType', () => {
  it('removes the mainModule type and the GlobalProps block it leaves empty', () => {
    expect(stripMainModuleType(generated)).toBe(`declare namespace Cloudflare {
\tinterface StagingEnv {
\t\tSITE_ENVIRONMENT: "staging";
\t}
}
`)
  })

  it('keeps any other GlobalProps member', () => {
    const withOther = generated.replace(
      '\t\tmainModule',
      '\t\tdurableNamespaces: "Queue";\n\t\tmainModule'
    )
    expect(stripMainModuleType(withOther)).toContain(
      '\tinterface GlobalProps {\n\t\tdurableNamespaces: "Queue";\n\t}\n'
    )
  })

  it('leaves a file without it unchanged', () => {
    const stripped = stripMainModuleType(generated)
    expect(stripMainModuleType(stripped)).toBe(stripped)
  })

  it('has been applied to the committed cloudflare-env.d.ts', () => {
    const committed = fs.readFileSync(path.join(__dirname, '..', 'cloudflare-env.d.ts'), 'utf8')
    expect(committed).not.toContain('typeof import("./worker")')
    expect(stripMainModuleType(committed)).toBe(committed)
  })
})
