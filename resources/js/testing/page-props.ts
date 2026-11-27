import type { FlashData, SharedPageProps } from '@inertiajs/core';

import type { Locale } from '@/types/generated';
import type { SharedAuth } from '@/types/global';

type FakePageOptions = {
    locale?: Locale;
    auth?: Partial<SharedAuth>;
    flash?: FlashData;
    clearLocalCopy?: boolean;
};

export type FakePage = {
    url: string;
    props: SharedPageProps;
    flash: FlashData;
};

/** The page of the shared Inertia fake (`setPage` in `@/testing/inertia`). */
export const fakePage = ({
    locale = 'nl',
    auth = {},
    flash = {},
    clearLocalCopy = false,
}: FakePageOptions = {}): FakePage => ({
    url: `/${locale}`,
    props: {
        name: 'Printopoly',
        locale,
        locales: ['nl', 'en'],
        localizedUrls: {
            nl: 'http://localhost/nl',
            en: 'http://localhost/en',
        },
        pageUrls: {
            printGuide: locale === 'nl' ? '/nl/printgids' : '/en/print-guide',
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
        clearLocalCopy,
    },
    flash,
});
