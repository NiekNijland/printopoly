import { formatMoney } from '@/lib/render/standard-edition';
import type { CurrencyId, Locale } from '@/types/game';

import type { PageItem, PageSpec } from '../../lib/render/print-composition';

/**
 * The page plan names things in Dutch (it is plain data for tests). What is printed on the sheets follows
 * the language of the edition.
 */
const EN: ReadonlyArray<readonly [string, string]> = [
    ['Paneel', 'Panel'],
    ['Bord', 'Board'],
    ['Kaarten', 'Cards'],
    ['voorkant', 'fronts'],
    ['achterkant', 'backs'],
    ['Speelgeld', 'Play money'],
    ['Pionnen', 'Pawns'],
    ['Doosdeksel', 'Box lid'],
    ['Proefvel', 'Test sheet'],
    ['Liniaal', 'Ruler'],
    ['Bankpas', 'Bank card'],
    ['Hoekvak', 'Corner space'],
    ['Gewoon vak', 'Regular space'],
];

export const localizeLabel = (label: string, locale: Locale): string => {
    if (locale === 'nl') {
        return label;
    }

    return EN.reduce(
        (text, [nl, en]) => text.replace(nl, en),
        // A decimal point in English: "38.22 mm", not "38,22 mm" (Lukas, R5-19).
        label.replace(/\bt\/m\b/, 'to').replace(/(\d),(\d)/g, '$1.$2'),
    );
};

const noteValue = (item: PageItem): number | null => {
    const value = Number((item.elementKey ?? '').split('.')[1]);

    return item.kind === 'note' && Number.isFinite(value) ? value : null;
};

/**
 * The text printed in the margin of a sheet. A sheet of banknotes names the denominations on it, so you
 * know which notes you hold (the instructions promise that); other sheets use the label of the plan.
 */
export const pageLabel = (
    page: PageSpec,
    locale: Locale,
    currency: CurrencyId,
    symbol?: string,
    /** Which sheet of the PDF this is and of how many: a sheet of money says "vel 3 van 22" (B253, Ingrid). */
    sheet?: { number: number; of: number },
): string | null => {
    const values = [
        ...new Set(page.items.map(noteValue).filter((value) => value !== null)),
    ];

    if (values.length > 0) {
        const title = locale === 'nl' ? 'Speelgeld' : 'Play money';
        // A sheet of one of more sets says which (B242).
        const set = page.items[0]?.setNumber;
        const suffix = set === undefined ? '' : ` · SET ${String(set)}`;
        const count =
            sheet === undefined
                ? ''
                : locale === 'nl'
                  ? ` · vel ${String(sheet.number)} van ${String(sheet.of)}`
                  : ` · sheet ${String(sheet.number)} of ${String(sheet.of)}`;

        return `${title}: ${values.map((value) => formatMoney(value, currency, locale, symbol)).join(', ')}${suffix}${count}`;
    }

    return page.label === null ? null : localizeLabel(page.label, locale);
};

/** How high the label band at the top of a sheet is, in mm. */
const LABEL_TOP = 1.5;
const LABEL_BOTTOM = 6;

/**
 * Where the label of a sheet goes (B253): in the widest stretch of the top margin that no crop mark crosses, so a
 * mark never strikes through it (Ingrid: "€ 20" looked crossed out). The label is centred in that stretch.
 */
export const labelSpan = (page: PageSpec): { left: number; right: number } => {
    const xs = page.cropMarks
        .filter(
            (mark) =>
                Math.min(mark.y1, mark.y2) < LABEL_BOTTOM &&
                Math.max(mark.y1, mark.y2) > LABEL_TOP,
        )
        .flatMap((mark) => [mark.x1, mark.x2])
        .sort((a, b) => a - b);
    const edges = [0, ...xs, page.size.w];
    let best = { left: 0, right: page.size.w };
    let widest = -1;

    for (let i = 0; i < edges.length - 1; i++) {
        const left = edges[i] ?? 0;
        const right = edges[i + 1] ?? page.size.w;

        if (right - left > widest) {
            widest = right - left;
            best = { left, right };
        }
    }

    return best;
};
