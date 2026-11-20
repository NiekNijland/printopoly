import type { Locale, Localized } from '../game/types';
import type { CheckIssue } from './types';

export interface CheckSummary {
    count: number;
    errors: number;
    warnings: number;
    /** "Controle: 2", or the "nothing found" sentence from the design. */
    label: string;
}

const HEADING: Localized = { nl: 'Controle', en: 'Check' };
const NOTHING: Localized = {
    nl: 'niets gevonden. Gecontroleerd: fotoscherpte, tekst en bordmaat.',
    en: 'nothing found. Checked: photo sharpness, text and board size.',
};

export function summarize(
    issues: readonly CheckIssue[],
    locale: Locale,
): CheckSummary {
    const errors = issues.filter((i) => i.severity === 'error').length;
    return {
        count: issues.length,
        errors,
        warnings: issues.length - errors,
        label: `${HEADING[locale]}: ${issues.length === 0 ? NOTHING[locale] : issues.length}`,
    };
}

/** Issues belonging to one element, for the warning next to the field itself (B94). */
export function issuesFor(
    issues: readonly CheckIssue[],
    elementKey: string,
    field?: string,
): CheckIssue[] {
    return issues.filter(
        (i) =>
            i.elementKey === elementKey &&
            (field === undefined || i.field === field),
    );
}
