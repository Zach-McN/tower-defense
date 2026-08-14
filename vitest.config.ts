import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * The test runner's copy of the one fact `tsconfig.json` records: where the
 * kernel sits. The typechecker reads `paths`, the editor's bundler carries its
 * own alias (`kernel-2d/scripts/game-code.ts`), and vitest reads neither — so
 * the same mapping is written here, pointing at the same file. All three must
 * name `runtime/game/api.ts`, the kernel's game-facing surface; if this folder
 * or the kernel moves, this line changes with the tsconfig's and nothing under
 * `src/` does.
 */
export default defineConfig({
  resolve: {
    alias: {
      'kernel-2d/runtime': fileURLToPath(new URL('../../kernel-2d/runtime/game/api.ts', import.meta.url)),
    },
  },
})
