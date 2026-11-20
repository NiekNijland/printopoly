import type { ResolvedComponent } from '@inertiajs/react';
import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { LaravelReactI18nProvider } from 'laravel-react-internationalization';
import { renderToString } from 'react-dom/server';

import { resolvePageLayout } from '@/layouts/resolve-page-layout';
import { documentTitle, resolvePage } from '@/lib/pages';

declare const __SSR_RELEASE_ID__: string | null;

const pages = import.meta.glob<ResolvedComponent>([
    './pages/**/*.tsx',
    '!**/*.test.*',
]);

// The SSR worker needs every catalogue synchronously while rendering.
const catalogues = import.meta.glob<Record<string, string>>('/lang/*.json', {
    eager: true,
    import: 'default',
});

createServer(
    async (page) => {
        const response = await createInertiaApp({
            page,
            render: renderToString,
            title: documentTitle,
            resolve: (name) => resolvePage(pages, name),
            layout: resolvePageLayout,
            setup: ({ App, props }) => {
                const locale = String(props.initialPage.props.locale);

                return (
                    <LaravelReactI18nProvider
                        locale={locale}
                        fallbackLocale={locale}
                        files={catalogues}
                    >
                        <App {...props} />
                    </LaravelReactI18nProvider>
                );
            },
        });

        // Embedded at build time: a worker that outlives a deploy keeps its
        // own identity, and the PHP gateway drops its answers (B66).
        return response
            ? { ...response, release: __SSR_RELEASE_ID__ }
            : response;
    },
    {
        port: Number(import.meta.env.VITE_INERTIA_SSR_PORT) || 13716,
        host: '127.0.0.1',
        cluster: false,
    },
);
