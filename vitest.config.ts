import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts so tests do not run the build-time
// environment-variable guard, and so they need no Supabase credentials.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
