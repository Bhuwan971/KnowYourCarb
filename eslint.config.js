const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  {
    ignores: [
      'scaffold/**',
      '.npm-cache/**',
      'dist/**',
      'server/**',
      'tests/**',
      'test-results/**',
    ],
  },
]);
