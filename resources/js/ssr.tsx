import type { ResolvedComponent } from '@inertiajs/react';
import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { LaravelReactI18nProvider } from 'laravel-react-internationalization';
import { renderToString } from 'react-dom/server';

import { resolvePageLayout } from '@/layouts/resolve-page-layout';
import { documentTitle, resolvePage } from '@/lib/pages';

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
    (page) =>
        createInertiaApp({
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
        }),
    {
        port: Number(import.meta.env.VITE_INERTIA_SSR_PORT) || 13714,
        host: '127.0.0.1',
        cluster: false,
    },
);
