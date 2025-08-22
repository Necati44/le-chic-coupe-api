// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ➜ AJOUT : flag pour assouplir en CI
const LOOSE = process.env.CI_LINT_LOOSE === '1';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Règles globales (dur en local, souple en CI)
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      // ➜ en CI : on relâche les "unsafe*" & no-unused-vars
      '@typescript-eslint/no-unsafe-assignment': LOOSE ? 'off' : 'error',
      '@typescript-eslint/no-unsafe-member-access': LOOSE ? 'off' : 'error',
      '@typescript-eslint/no-unsafe-call': LOOSE ? 'off' : 'error',
      '@typescript-eslint/no-unsafe-argument': LOOSE ? 'off' : 'warn',
      '@typescript-eslint/no-unused-vars': [LOOSE ? 'warn' : 'error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
  // Règles spécifiques aux tests (toujours souples)
  {
    files: ['test/**/*.ts', '**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
