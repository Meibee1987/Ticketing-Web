import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    'dist',
    'src/Pages/JadwalPage1.jsx',
    'src/Pages/dashboard/*_backup.jsx',
    'src/Pages/dashboard/*_old.jsx',
    'src/Pages/dashboard/*.jsx.backup',
    'src/Pages/dashboard/OverviewPage.jsx',
    'src/Pages/dashboard/DashboardLayout.jsx',
    'src/Pages/dashboard/DashboardTicketPage.jsx',
    'src/Pages/dashboard/CreateTicketPage.jsx',
    'src/components/Modal.jsx',
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      prettier,
    },
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
      ...prettierConfig.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'prettier/prettier': 'error',
    },
  },
]);
