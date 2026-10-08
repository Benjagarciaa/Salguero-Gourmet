import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Además de los ignorados de eslint-config-next (.next, out, build,
  // next-env.d.ts).
  globalIgnores([
    // Lo archivado (código sin uso, reversible): ni lint ni tsc lo miran.
    "_assets/**",
    // Configuración local y worktrees de Claude Code (traen su propio .next).
    ".claude/**",
  ]),
]);

export default eslintConfig;
