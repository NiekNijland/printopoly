import { useLaravelReactI18n } from 'laravel-react-internationalization';

type Replacements = Record<string, string | number>;

/**
 * Translate a key from lang/{locale}.json. Every user-facing string goes
 * through this so the site stays bilingual (B37).
 */
export const useTranslation = (): ((
    key: string,
    replacements?: Replacements,
) => string) => {
    const { t } = useLaravelReactI18n();

    return t;
};

/**
 * Translate a key with singular and plural forms: `"{1} :count editie|[2,*] :count edities"`.
 * `:count` is filled in with the number.
 */
export const useTranslationChoice = (): ((
    key: string,
    count: number,
    replacements?: Replacements,
) => string) => {
    const { tChoice } = useLaravelReactI18n();

    return tChoice;
};
