import type { Locale } from '@/types/game';

const copySuffix: Record<Locale, string> = { nl: 'kopie', en: 'copy' };

/**
 * "Club" becomes "Club (kopie)", a copy of that becomes "Club (kopie 2)", and so on: the
 * suffix is counted, never stacked, and skips names that already exist (bug 36, ronde 4).
 */
export const copyName = (
    name: string,
    language: Locale,
    existing: readonly string[],
): string => {
    const word = copySuffix[language];
    const base =
        name.replace(/\s*\((?:kopie|copy)(?:\s+\d+)?\)$/u, '').trimEnd() ||
        name;
    const taken = new Set(existing.map((other) => other.trim()));
    let candidate = `${base} (${word})`;
    for (let n = 2; taken.has(candidate); n++) {
        candidate = `${base} (${word} ${n})`;
    }

    return candidate;
};
