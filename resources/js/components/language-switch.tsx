import { usePage } from '@inertiajs/react';

import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

/**
 * NL / EN as a segmented switch (B110). Plain links and a full page load, so
 * the other language's catalogue and the server-rendered HTML arrive together.
 */
export function LanguageSwitch({ className }: { className?: string }) {
    const { locale, locales, localizedUrls } = usePage().props;
    const t = useTranslation();

    return (
        <nav
            aria-label={t('nav.language')}
            className={cn(
                'inline-flex overflow-hidden rounded-control border-2 border-ink bg-card text-sm',
                className,
            )}
        >
            {locales.map((code) => {
                const current = code === locale;

                return (
                    <a
                        key={code}
                        href={localizedUrls[code]}
                        lang={code}
                        hrefLang={code}
                        aria-current={current ? 'true' : undefined}
                        className={cn(
                            'inline-flex min-h-11 min-w-11 items-center justify-center px-3 font-semibold no-underline',
                            current
                                ? 'bg-ink text-paper'
                                : 'text-ink hover:bg-print-chance',
                        )}
                    >
                        {code.toUpperCase()}
                    </a>
                );
            })}
        </nav>
    );
}
