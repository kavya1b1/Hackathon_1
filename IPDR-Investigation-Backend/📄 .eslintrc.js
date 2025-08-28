module.exports = {
    env: {
        es2021: true,
        node: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
    },
    rules: {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-console': 'warn',
        'no-unused-vars': 'warn',
        'no-undef': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],
        'comma-dangle': ['error', 'never'],
        'eol-last': ['error', 'always'],
        'no-trailing-spaces': 'error',
        'space-before-function-paren': ['error', 'never'],
        'keyword-spacing': ['error', { 'before': true, 'after': true }],
        'space-infix-ops': 'error',
        'comma-spacing': ['error', { 'before': false, 'after': true }],
        'brace-style': ['error', '1tbs'],
        'curly': ['error', 'all'],
        'no-multiple-empty-lines': ['error', { 'max': 2 }],
        'padded-blocks': ['error', 'never']
    },
    globals: {
        'process': 'readonly',
        '__dirname': 'readonly',
        'module': 'readonly',
        'require': 'readonly',
        'exports': 'readonly',
        'console': 'readonly',
        'Buffer': 'readonly',
        'global': 'readonly',
        'setTimeout': 'readonly',
        'clearTimeout': 'readonly',
        'setInterval': 'readonly',
        'clearInterval': 'readonly'
    }
};
