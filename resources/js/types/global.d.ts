import type { AuthUserData, Locale } from '@/types/generated';

export interface SharedAuth {
    user: AuthUserData | null;
    googleLoginEnabled: boolean;
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        flashDataType: {
            error?: string;
        };
        sharedPageProps: {
            name: string;
            locale: Locale;
            locales: Locale[];
            localizedUrls: Record<Locale, string>;
            auth: SharedAuth;
        };
    }
}
