import { usePage } from '@inertiajs/react';

import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

/**
 * NL / EN. A plain link and a full page load, so the other language's
 * catalogue and the server-rendered HTML arrive together.
 */
export function LanguageSwitch({ className }: { className?: string }) {
    const { locale, locales, localizedUrls } = usePage().props;
    const t = useTranslation();

    return (
        <nav
            aria-label={t('nav.language')}
            className={cn('flex gap-1 text-sm', className)}
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
                            'inline-flex min-h-12 items-center px-1 underline hover:text-press',
                            current
                                ? 'font-semibold text-ink'
                                : 'text-ink-soft',
                        )}
                    >
                        {code.toUpperCase()}
                    </a>
                );
            })}
        </nav>
    );
}
