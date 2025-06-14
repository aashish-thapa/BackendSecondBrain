// .eslintrc.js - ESLint configuration
import globals from 'globals';
import js from '@eslint/js';

export default [
  js.configs.recommended, // Use recommended ESLint rules
  {
    languageOptions: {
      ecmaVersion: 2022, // Set ECMAScript version to ES2022
      sourceType: 'module', // Use ES module syntax
      globals: {
        ...globals.node, // Enable Node.js global variables
        ...globals.jest, // Enable Jest global variables for tests
      },
    },
    rules: {
      // Custom rules
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Warn about unused variables, ignore those starting with '_'
      'no-console': 'warn', // Warn about console.log statements
      'indent': ['error', 2, { SwitchCase: 1 }], // Enforce 2-space indentation
      'quotes': ['error', 'single'], // Enforce single quotes
      'semi': ['error', 'always'], // Enforce semicolons at the end of statements
      'comma-dangle': ['error', 'always-multiline'], // Enforce trailing commas for multiline
      'object-curly-spacing': ['error', 'always'], // Enforce spaces inside curly braces for objects
      'array-bracket-spacing': ['error', 'never'], // Disallow spaces inside curly braces for arrays
      'block-spacing': ['error', 'always'], // Enforce consistent spacing inside of blocks
      'key-spacing': ['error', { beforeColon: false, afterColon: true }], // Enforce consistent spacing for object literal properties
      'space-infix-ops': 'error', // Enforce spaces around infix operators
      'no-trailing-spaces': 'error', // Disallow trailing whitespace at the end of lines
      'no-multiple-empty-lines': ['error', { max: 1 }], // Disallow multiple empty lines
      'space-before-function-paren': ['error', 'never'], // Disallow space before function parentheses
      'space-before-blocks': 'error', // Enforce consistent spacing before blocks
    },
    files: ['**/*.js'], // Apply rules to all .js files
    ignores: ['node_modules/', 'dist/', '.husky/'], // Ignore these directories/files
  },
];
