import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // scratch/ holds archived, UTF-16 encoded copies of superseded components.
  // They are not part of the build (Vite only bundles from src/ via index.html)
  // and nothing imports them, but they are tracked in git so they would
  // otherwise be linted. UTF-16 encoding makes them unparseable, which
  // surfaced as spurious "Parsing error: Unexpected character" reports.
  globalIgnores(['dist', 'scratch']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]|motion' }],
    },
  },
  {
    // Test scripts in tests/ run under Node, not the browser, so they need
    // Node globals (process, etc.) on top of the browser set above.
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // tests/test_regexCleanup.js deliberately contains the original escaped
    // regex forms so it can compare them against the cleaned-up versions, so
    // its escapes are load-bearing rather than useless.
    files: ['tests/test_regexCleanup.js'],
    rules: {
      'no-useless-escape': 'off',
    },
  },
])
