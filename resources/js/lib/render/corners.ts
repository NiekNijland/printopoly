import { standardEdition } from '@/lib/game/standard-edition';
import type { CornerKind, CurrencyId, Locale } from '@/lib/game/types';

import { STRINGS } from './strings';
import { money } from './words';

/** Which corner a space is, or `undefined` for a space that is not a corner. */
export function cornerOf(position: number): CornerKind | undefined {
    const space = standardEdition.spaces[position];

    return space?.type === 'corner' ? space.corner : undefined;
}

/**
 * The short text a corner prints when the edition sets none: the salary line on Start and the label in the jail.
 * The other two corners print no text. It is what the editor shows as placeholder.
 */
export function standardCornerText(
    corner: CornerKind,
    locale: Locale,
    currency: CurrencyId,
    symbol?: string,
    /** The salary of the edition (B132); the standard salary when absent. */
    salary?: number,
): string {
    const t = STRINGS[locale];

    switch (corner) {
        case 'start': {
            const start = standardEdition.spaces[0];
            const amount =
                salary ?? (start?.type === 'corner' ? (start.salary ?? 0) : 0);

            return t.startSalary(
                money(amount, currency, locale, { currencySymbol: symbol }),
            );
        }
        case 'jail':
            return t.inJail;
        default:
            return '';
    }
}
