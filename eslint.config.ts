import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'drizzle/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  {
    files: ['**/*.tsx'],
    rules: {
      // Principle II: every user-facing string goes through a translation key.
      'react/jsx-no-literals': [
        'error',
        { noStrings: true, ignoreProps: true, allowedStrings: ['·', '₹', '/', ':', '–', '—', '(', ')', '*', '•', '×'] },
      ],
    },
  },
  {
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['src/shared/log.ts', 'src/features/demo/reset.ts'],
    rules: { 'no-console': 'off' },
  },
];

export default config;
