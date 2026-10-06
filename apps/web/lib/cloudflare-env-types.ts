/**
 * `wrangler types` (run by `pnpm cf-typegen`) writes `GlobalProps.mainModule: typeof
 * import("./worker")` into cloudflare-env.d.ts. That import pulls worker.ts into `tsc` despite the
 * tsconfig exclude, and once a Worker build exists, worker.ts's `@ts-expect-error` imports of
 * `.open-next/` are unused, so `pnpm typecheck` and the type check in `next build` fail.
 * `cf-typegen` strips it after generating (scripts/strip-main-module-type.ts). Nothing here uses
 * `ctx.exports`, the only thing that type is for, and `wrangler types --check` compares only the
 * hash, so the stripped file still reads as up to date.
 */

// The generated block when `mainModule` is its only member, and the member on its own otherwise.
// Neither matches the runtime types' own empty `interface GlobalProps {}` further down the file.
const MAIN_MODULE_BLOCK =
  /^[ \t]*interface GlobalProps \{\n[ \t]*mainModule: typeof import\("\.\/worker"\);\n[ \t]*\}\n/m
const MAIN_MODULE_MEMBER = /^[ \t]*mainModule: typeof import\("\.\/worker"\);\n/m

export function stripMainModuleType(source: string): string {
  return source.replace(MAIN_MODULE_BLOCK, '').replace(MAIN_MODULE_MEMBER, '')
}
