import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/actions/**/*.ts"],
    rules: {
      // Server actions: block-scoped redeclarations shadow outer bindings and fail `next build`.
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/no-use-before-define": [
        "error",
        { functions: false, classes: true, variables: true },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Third-party skill scripts and generated artifacts not app source.
    ".agents/**",
    ".cursor/**",
    ".agent-skills/**",
    "lint-src.json",
    "lint-agents.json",
  ]),
]);

export default eslintConfig;
