export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'docs/**', 'apps/web/public/**', 'e2e/**', 'packages/**']
  },
  {
    files: ['apps/web/src/**/*.{js,jsx}', 'apps/api/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_|^React$' }],
      'no-undef': 'off',
      'no-constant-condition': 'warn',
      'no-debugger': 'error'
    }
  }
];
