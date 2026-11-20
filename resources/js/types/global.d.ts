import type { AuthUserData, Locale, SeoData } from '@/types/generated';

export interface SharedAuth {
    user: AuthUserData | null;
    googleLoginEnabled: boolean;
}

/** Paths of the public pages in the current language (slugs differ per language). */
export interface SharedPageUrls {
    printGuide: string;
    faq: string;
    privacy: string;
    terms: string;
    contact: string;
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        flashDataType: {
            error?: string;
            /** Set after logging out: the editor wipes the local copy of the editions. */
            clearLocalCopy?: boolean;
        };
        sharedPageProps: {
            name: string;
            locale: Locale;
            locales: Locale[];
            localizedUrls: Record<Locale, string>;
            pageUrls: SharedPageUrls;
            seo: SeoData | null;
            auth: SharedAuth;
        };
    }
}
