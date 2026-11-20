import type { Locale } from '@/types/generated';
import type { SharedAuth } from '@/types/global';

interface FakePageOptions {
    locale?: Locale;
    auth?: Partial<SharedAuth>;
    flash?: { error?: string };
}

/** The shape usePage() returns, for mocking @inertiajs/react in tests. */
export function fakePage({
    locale = 'nl',
    auth = {},
    flash = {},
}: FakePageOptions = {}) {
    return {
        props: {
            name: 'Printopoly',
            locale,
            locales: ['nl', 'en'] as Locale[],
            localizedUrls: {
                nl: 'http://localhost/nl',
                en: 'http://localhost/en',
            },
            pageUrls: {
                printGuide:
                    locale === 'nl' ? '/nl/printgids' : '/en/print-guide',
                faq: locale === 'nl' ? '/nl/vragen' : '/en/faq',
                privacy: `/${locale}/privacy`,
                terms: locale === 'nl' ? '/nl/voorwaarden' : '/en/terms',
                contact: `/${locale}/contact`,
            },
            seo: null,
            auth: {
                user: null,
                googleLoginEnabled: false,
                ...auth,
            },
        },
        flash,
    };
}
