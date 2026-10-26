import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'google-apps-script-calendar.js', 'supabase/functions/**']),
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
      'no-unused-vars': ['error', { 
        varsIgnorePattern: '^[A-Z_]|^_',
        argsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
    },
  },
  // Test files configuration - more lenient
  {
    files: ['**/*.{test,spec}.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        global: 'readonly',
        Buffer: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        render: 'readonly',
        screen: 'readonly',
        fireEvent: 'readonly',
        waitFor: 'readonly',
        renderHook: 'readonly',
        act: 'readonly',
        within: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { 
        varsIgnorePattern: '^[A-Z_]|^_',
        argsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-undef': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/globals': 'off',  // Allow ref modifications for test patterns
    },
  },
  // Context files - allow exporting hooks along with providers
  {
    files: ['**/*Context.jsx', '**/*context.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Hook files - allow exporting hooks
  {
    files: ['**/useXXX.jsx', '**/useXXX.js', '**/use*.jsx', '**/use*.js'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Router files - allow exporting helper components
  {
    files: ['**/routing/*.jsx', '**/routing/*.js'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Main entry file - has side effects
  {
    files: ['**/main.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // React Compiler warning suppressions - informational warnings about memoization optimization
  {
    files: [
      '**/developer/hooks/useDevApi.js',
      '**/contexts/RegionalContext.jsx',
      '**/hooks/pageBuilder/useElementSettings.js'
    ],
    rules: {
      'react-compiler/react-compiler': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
])

