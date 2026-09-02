export default {
  ignores: ['dist/**', 'build/**', 'coverage/**', '.next/**', 'generated/**'],
  rules: {
    'no-console': 'warn',
    'no-undef': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
};
