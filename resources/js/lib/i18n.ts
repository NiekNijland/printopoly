export type TranslationCatalog = Record<string, string>;

/**
 * The catalogues in lang/*.json, keyed the way LaravelReactI18nProvider
 * expects them ("/lang/nl.json"). They stay lazy so the browser loads only
 * the active language; the SSR entry imports them eagerly instead.
 */
const loaders = import.meta.glob<TranslationCatalog>('/lang/*.json', {
    import: 'default',
});

export function catalogPath(locale: string): string {
    return `/lang/${locale}.json`;
}

export async function loadCatalog(
    locale: string,
): Promise<Record<string, TranslationCatalog>> {
    const path = catalogPath(locale);
    const load = loaders[path];

    if (!load) {
        throw new Error(`Translation catalogue not found: ${path}`);
    }

    return { [path]: await load() };
}
