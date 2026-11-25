export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'AUDIT/**', 'public/**', 'tests/e2e/**']
  },
  {
    files: ['src/**/*.{js,jsx}', 'server/**/*.js'],
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
