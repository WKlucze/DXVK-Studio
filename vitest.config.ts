import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test environment for Node.js (Electron main process)
    environment: 'node',

    // Include test files
    include: ['electron/**/*.test.ts'],

    // Globals for describe, it, expect
    globals: true,

    // TypeScript support
    typecheck: {
      enabled: false // Skip for speed, rely on tsc
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['electron/services/**/*.ts'],
      exclude: ['**/*.test.ts', '**/__tests__/**']
    }
  }
})
