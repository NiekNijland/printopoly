import { formatMoney } from '@/lib/game/standard-edition';
import type { CurrencyId, Locale } from '@/lib/game/types';

import type { PageItem, PageSpec } from './composition';

/**
 * The page plan names things in Dutch (it is plain data for tests). What is printed on the sheets follows
 * the language of the edition.
 */
const EN: ReadonlyArray<readonly [string, string]> = [
    ['Paneel', 'Panel'],
    ['Bord', 'Board'],
    ['Kaarten', 'Cards'],
    ['Speelgeld', 'Play money'],
    ['Pionnen', 'Pawns'],
    ['Doosdeksel', 'Box lid'],
    ['Proefvel', 'Test sheet'],
    ['Liniaal', 'Ruler'],
    ['Bankpas', 'Bank card'],
    ['Hoekvak', 'Corner space'],
    ['Gewoon vak', 'Regular space'],
];

export function localizeLabel(label: string, locale: Locale): string {
    if (locale === 'nl') {
        return label;
    }

    return EN.reduce(
        (text, [nl, en]) => text.replace(nl, en),
        label.replace(/\bt\/m\b/, 'to'),
    );
}

function noteValue(item: PageItem): number | null {
    const value = Number((item.elementKey ?? '').split('.')[1]);

    return item.kind === 'note' && Number.isFinite(value) ? value : null;
}

/**
 * The text printed in the margin of a sheet. A sheet of banknotes names the denominations on it, so you
 * know which notes you hold (the instructions promise that); other sheets use the label of the plan.
 */
export function pageLabel(
    page: PageSpec,
    locale: Locale,
    currency: CurrencyId,
    symbol?: string,
): string | null {
    const values = [
        ...new Set(
            page.items
                .map(noteValue)
                .filter((value): value is number => value !== null),
        ),
    ];

    if (values.length > 0) {
        const title = locale === 'nl' ? 'Speelgeld' : 'Play money';

        return `${title}: ${values.map((value) => formatMoney(value, currency, locale, symbol)).join(', ')}`;
    }

    return page.label === null ? null : localizeLabel(page.label, locale);
}
