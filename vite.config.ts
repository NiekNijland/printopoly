import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig(({ command, isSsrBuild }) => ({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.tsx',
                // The print page that headless Chrome renders into PDF (B54).
                'resources/js/print.tsx',
            ],
            refresh: true,
        }),
        inertia({
            ssr: {
                entry: 'resources/js/ssr.tsx',
                // The SSR entry passes its own matching server options.
                cluster: false,
                sourcemap: false,
            },
        }),
        react(),
        babel({ presets: [reactCompilerPreset()] }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
            command:
                'php artisan wayfinder:generate --with-form --no-interaction',
        }),
    ],
    // The release artifact ships without node_modules, so the SSR bundle has
    // to carry its own dependencies (scripts/check-ssr-self-contained.mjs).
    ssr: {
        noExternal: true,
    },
    define:
        command === 'build' && isSsrBuild
            ? { 'process.env.NODE_ENV': JSON.stringify('production') }
            : {},
    build: {
        target: ['es2020', 'safari14'],
        sourcemap: 'hidden',
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
}));
