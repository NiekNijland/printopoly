import { usePage } from '@inertiajs/react';
import { useEffect, type ReactNode } from 'react';

import { AppFooter } from '@/components/app-footer';
import { AppHeader } from '@/components/app-header';
import { useTranslation } from '@/hooks/use-translation';
import { wipeLocalCopy } from '@/lib/editor/account';
import { getServices } from '@/lib/editor/services';

/**
 * Header, content and footer for the public pages and Mijn edities. These
 * pages are server-rendered (B66).
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
    const { flash } = usePage();
    const t = useTranslation();
    const { locale } = usePage().props;
    const clearLocalCopy = flash.clearLocalCopy === true;

    // After a logout through a plain request the server flashes this: the copy in this browser goes (Staten).
    useEffect(() => {
        if (clearLocalCopy) {
            void wipeLocalCopy(getServices(locale).repository).catch(
                () => undefined,
            );
        }
    }, [clearLocalCopy, locale]);

    return (
        <div className="flex min-h-screen flex-col bg-paper text-ink">
            <a
                href="#content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-card focus:px-4 focus:py-3"
            >
                {t('app.skip_to_content')}
            </a>
            <AppHeader />
            {flash.error !== undefined && (
                <div className="px-4 pt-4 md:px-8">
                    <p
                        role="alert"
                        className="mx-auto max-w-content rounded-control border-2 border-press bg-card px-4 py-3 text-sm font-semibold"
                    >
                        {flash.error}
                    </p>
                </div>
            )}
            <main id="content" className="flex-1">
                {children}
            </main>
            <AppFooter />
        </div>
    );
}
