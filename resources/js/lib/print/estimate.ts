import type { PrintPart } from '@/types/generated';

import { DEFAULT_BOARD_PROFILE, type BoardProfile } from './board';
import {
    composePages,
    type PageSpec,
    type PrintEdition,
    type PrintSet,
} from './composition';
import { splitPanels } from './panels';
import type { Size } from './types';

/** What a quantity counts: sheets of paper, or what a print shop sells per piece. */
export type QuantityUnit = 'sheet' | 'panel' | 'card' | 'booklet' | 'piece';

export type Paper = 'A4' | 'A3' | 'SRA3';

export interface PartQuantity {
    count: number;
    unit: QuantityUnit;
    paper: Paper | null;
}

/** Parts printed on both sides at home: two pages of the PDF are one sheet. */
const DUPLEX_AT_HOME: readonly PrintPart[] = ['cards', 'rules_booklet'];

function paperOf(size: Size): Paper | null {
    const [short, long] = [
        Math.round(Math.min(size.w, size.h)),
        Math.round(Math.max(size.w, size.h)),
    ];

    if (short === 210 && long === 297) {
        return 'A4';
    }

    if (short === 297 && long === 420) {
        return 'A3';
    }

    if (short === 320 && long === 450) {
        return 'SRA3';
    }

    return null;
}

function sheets(pages: PageSpec[], duplex: boolean): PartQuantity {
    const first = pages[0];

    return {
        count: duplex ? Math.ceil(pages.length / 2) : pages.length,
        unit: 'sheet',
        paper: first === undefined ? null : paperOf(first.size),
    };
}

/**
 * How much one part takes for one set, before it is made (UX 3 of test round 3): sheets of paper at home, and at
 * the print shop what you order (panels, cards, sheets of SRA3, a booklet). It is counted from the same page plan
 * the PDF is made from, so the number never differs from the PDF. `App\Print\PrintQuantity` counts the same.
 */
export function partQuantity(
    part: PrintPart,
    set: PrintSet,
    edition: PrintEdition,
    profile: BoardProfile = edition.boardProfile ?? DEFAULT_BOARD_PROFILE,
): PartQuantity {
    const pages = composePages(part, set, edition, profile);

    if (set === 'home') {
        return sheets(pages, DUPLEX_AT_HOME.includes(part));
    }

    switch (part) {
        case 'board':
            return { count: pages.length, unit: 'panel', paper: null };
        case 'cards':
            return { count: pages.length / 2, unit: 'card', paper: null };
        case 'box_lid':
            return { count: 1, unit: 'piece', paper: null };
        case 'invitation':
            return { count: 1, unit: 'piece', paper: null };
        case 'rules_booklet':
            return { count: 1, unit: 'booklet', paper: null };
        default:
            return sheets(pages, false);
    }
}

/** The size of one board panel without bleed, in whole mm, from the board profile (bug 22 of test round 3). */
export function panelSize(profile: BoardProfile): {
    w: number;
    h: number;
    count: number;
} {
    const panels = splitPanels(profile);
    const first = panels[0];

    return {
        w: first === undefined ? 0 : Math.round(first.trim.w * 10) / 10,
        h: first === undefined ? 0 : Math.round(first.trim.h * 10) / 10,
        count: panels.length,
    };
}

export interface SetEstimate {
    /** Sheets per paper size, summed over the parts. */
    sheets: Partial<Record<Paper, number>>;
    /** Sheets of play money, so the bar can say how much of the total it is. */
    moneySheets: number;
    /** What is ordered per piece at the print shop. */
    pieces: Partial<Record<Exclude<QuantityUnit, 'sheet'>, number>>;
}

/** The total of a set over the chosen parts, times the number of sets (Sanne's class set). */
export function setEstimate(
    quantities: readonly { part: PrintPart; quantity: PartQuantity }[],
    copies: number,
): SetEstimate {
    const estimate: SetEstimate = { sheets: {}, moneySheets: 0, pieces: {} };

    for (const { part, quantity } of quantities) {
        const count = quantity.count * copies;

        if (quantity.unit === 'sheet') {
            const paper = quantity.paper ?? 'A4';

            estimate.sheets[paper] = (estimate.sheets[paper] ?? 0) + count;

            if (part === 'money') {
                estimate.moneySheets += count;
            }
        } else {
            estimate.pieces[quantity.unit] =
                (estimate.pieces[quantity.unit] ?? 0) + count;
        }
    }

    return estimate;
}

type Translate = (
    key: string,
    replacements?: Record<string, string | number>,
) => string;
type TranslateChoice = (
    key: string,
    count: number,
    replacements?: Record<string, string | number>,
) => string;

const PIECE_ORDER = ['panel', 'card', 'booklet', 'piece'] as const;
const PAPER_ORDER: readonly Paper[] = ['A4', 'A3', 'SRA3'];

/** "Samen 31 vellen A4 en 1 vel A3, waarvan 24 speelgeld": the line in the fixed bar of the print page. */
export function describeEstimate(
    estimate: SetEstimate,
    copies: number,
    t: Translate,
    tc: TranslateChoice,
): string {
    const items = [
        ...PAPER_ORDER.flatMap((paper) => {
            const count = estimate.sheets[paper] ?? 0;

            return count > 0 ? [tc('print.qty.sheet', count, { paper })] : [];
        }),
        ...PIECE_ORDER.flatMap((unit) => {
            const count = estimate.pieces[unit] ?? 0;

            return count > 0 ? [tc(`print.qty.${unit}`, count)] : [];
        }),
    ];
    const last = items.pop();

    if (last === undefined) {
        return t('print.estimate.none');
    }

    const list =
        items.length === 0
            ? last
            : `${items.join(', ')} ${t('print.estimate.and')} ${last}`;
    const sheets = Object.values(estimate.sheets).reduce(
        (sum, count) => sum + count,
        0,
    );
    const money =
        estimate.moneySheets > 0 && estimate.moneySheets < sheets
            ? t('print.estimate.money', { count: estimate.moneySheets })
            : '';

    return copies > 1
        ? t('print.estimate.many', { copies, list: list + money })
        : t('print.estimate.one', { list: list + money });
}
