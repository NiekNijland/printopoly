import { useLaravelReactI18n } from 'laravel-react-internationalization';

type Replacements = Record<string, string | number>;

/**
 * Translate a key from lang/{locale}.json. Every user-facing string goes
 * through this so the site stays bilingual (B37).
 */
export function useTranslation(): (
    key: string,
    replacements?: Replacements,
) => string {
    const { t } = useLaravelReactI18n();

    return t;
}
