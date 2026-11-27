import type { Page } from '@inertiajs/core';
import { getInitialPageFromDOM } from '@inertiajs/core';
import type { ResolvedComponent } from '@inertiajs/react';
import { createInertiaApp } from '@inertiajs/react';
import { LaravelReactI18nProvider } from 'laravel-react-internationalization';
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';

import { listenForBackLayers } from '@/hooks/use-back-closes';
import { resolvePageLayout } from '@/layouts/resolve-page-layout';
import { startBugsnag } from '@/lib/bugsnag';
import { loadCatalog } from '@/lib/i18n';
import { documentTitle, resolvePage } from '@/lib/pages';

import '../css/app.css';

const pages = import.meta.glob<ResolvedComponent>([
    './pages/**/*.tsx',
    '!**/*.test.*',
]);

const bootstrap = async (): Promise<void> => {
    const initialPage = getInitialPageFromDOM<Page>('app');
    // Before Inertia adds its own listener: the back button closes an open layer first (R5-14).
    listenForBackLayers();

    if (initialPage === null) {
        throw new Error('Unable to read the initial Inertia page.');
    }

    // The interface language comes from the URL; a switch is a full page
    // load (LanguageSwitch), so one catalogue per visit is enough.
    const locale = String(initialPage.props.locale);
    const files = await loadCatalog(locale);

    await createInertiaApp({
        page: initialPage,
        title: documentTitle,
        resolve: (name) => resolvePage(pages, name),
        layout: resolvePageLayout,
        setup({ el, App, props }) {
            const application = (
                <StrictMode>
                    <LaravelReactI18nProvider
                        locale={locale}
                        fallbackLocale={locale}
                        files={files}
                    >
                        <App {...props} />
                    </LaravelReactI18nProvider>
                </StrictMode>
            );

            // Public pages arrive server-rendered (B66); the rest mount fresh.
            if (el.hasChildNodes()) {
                hydrateRoot(el, application);
            } else {
                createRoot(el).render(application);
            }
        },
        progress: {
            color: '#C8321F',
        },
    });
};

void bootstrap();
void startBugsnag();
