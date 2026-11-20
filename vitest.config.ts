import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, 'resources/js'),
        },
    },
    test: {
        environment: 'happy-dom',
        include: ['resources/js/**/*.test.{ts,tsx}'],
        globals: true,
        setupFiles: ['resources/js/testing/setup.ts'],
        css: false,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            reportsDirectory: 'coverage',
            include: ['resources/js/**/*.{ts,tsx}'],
            exclude: [
                'resources/js/app.tsx',
                'resources/js/ssr.tsx',
                'resources/js/actions/**',
                'resources/js/routes/**',
                'resources/js/wayfinder/**',
                'resources/js/types/**',
                'resources/js/testing/**',
            ],
        },
    },
});
