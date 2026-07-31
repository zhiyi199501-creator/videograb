import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Client hydration / auth bootstrap patterns trip this rule; keep
      // exhaustive-deps and other react-hooks rules from core-web-vitals.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
