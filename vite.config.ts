import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Layer aliases live only in tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
