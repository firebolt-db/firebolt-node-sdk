import eslintJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";

export default [
  // Base ESLint recommended rules
  eslintJs.configs.recommended,

  // Prettier configuration to avoid conflicts
  prettierConfig,

  // TypeScript specific configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        project: "./tsconfig.json"
      }
    },
    rules: {
      // TypeScript rules
    //   ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/explicit-function-return-type": "off"
    }
  },

  // Global configuration
  {
    ignores: ["node_modules/**"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        // Node.js globals
        process: "readonly",
        console: "readonly",
        // Jest globals
        jest: "readonly",
        expect: "readonly",
        test: "readonly",
        describe: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly"
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    }
  }
];
