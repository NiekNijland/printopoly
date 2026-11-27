import type { PrintPart } from '@/types/generated';

import {
    DEFAULT_BOARD_PROFILE,
    type BoardProfile,
} from '../../lib/render/print-board';
import {
    composePages,
    type PageSpec,
    type PrintEdition,
    type PrintSet,
} from '../../lib/render/print-composition';
import { splitPanels } from '../../lib/render/print-panels';
import type { Size } from '../../types/print';

/** What a quantity counts: sheets of paper, or what a print shop sells per piece. */
type QuantityUnit =
    'sheet' | 'panel' | 'board' | 'card' | 'booklet' | 'invitation' | 'piece';

/** Invitations on one A4 sheet at home (B244); PrintQuantity::INVITATIONS_PER_SHEET. */
export const INVITATIONS_PER_SHEET = 4;

/** Invitations without a choice: one sheet at home (B244); PrintJob::DEFAULT_INVITATIONS. */
export const DEFAULT_INVITATIONS = 4;

/** The most invitations the page counts with; PrintJob::MAX_INVITATIONS. */
export const MAX_INVITATIONS = 500;

/** The number of invitations of a set: the choice, else the default, within the limits. */
const invitationsOf = (edition: Pick<PrintEdition, 'invitations'>): number => {
    const chosen = edition.invitations;

    return typeof chosen === 'number' && Number.isFinite(chosen)
        ? Math.min(MAX_INVITATIONS, Math.max(1, Math.round(chosen)))
        : DEFAULT_INVITATIONS;
};

type Paper = 'A4' | 'A3' | 'SRA3';

export type PartQuantity = {
    count: number;
    unit: QuantityUnit;
    paper: Paper | null;
};

/** Parts printed on both sides at home: two pages of the PDF are one sheet. */
const DUPLEX_AT_HOME: readonly PrintPart[] = ['cards', 'rules_booklet'];

const paperOf = (size: Size): Paper | null => {
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
};

const sheets = (pages: PageSpec[], duplex: boolean): PartQuantity => {
    const first = pages[0];

    return {
        count: duplex ? Math.ceil(pages.length / 2) : pages.length,
        unit: 'sheet',
        paper: first === undefined ? null : paperOf(first.size),
    };
};

/**
 * How much one part takes for one set, before it is made (UX 3 of test round 3): sheets of paper at home, and at
 * the print shop what you order (panels, cards, sheets of SRA3, a booklet). It is counted from the same page plan
 * the PDF is made from, so the number never differs from the PDF. `App\Print\PrintQuantity` counts the same. It
 * counts one set, also when the PDF holds every set with its set mark (B242). The invitations follow the number
 * chosen for the set, four to an A4 sheet at home (B244); the whole board is one piece (B243).
 */
export const partQuantity = (
    part: PrintPart,
    set: PrintSet,
    edition: PrintEdition,
    profile: BoardProfile = edition.boardProfile ?? DEFAULT_BOARD_PROFILE,
): PartQuantity => {
    if (part === 'invitation') {
        const invitations = invitationsOf(edition);

        return set === 'home'
            ? {
                  count: Math.ceil(invitations / INVITATIONS_PER_SHEET),
                  unit: 'sheet',
                  paper: 'A4',
              }
            : { count: invitations, unit: 'invitation', paper: null };
    }

    const pages = composePages(part, set, { ...edition, sets: 1 }, profile);

    if (set === 'home') {
        return sheets(pages, DUPLEX_AT_HOME.includes(part));
    }

    switch (part) {
        case 'board':
            return edition.boardForm === 'whole'
                ? { count: 1, unit: 'board', paper: null }
                : { count: pages.length, unit: 'panel', paper: null };
        case 'cards':
            return { count: pages.length / 2, unit: 'card', paper: null };
        case 'box_lid':
            return { count: 1, unit: 'piece', paper: null };
        case 'rules_booklet':
            return { count: 1, unit: 'booklet', paper: null };
        case 'calibration':
        case 'money':
        case 'tokens':
            return sheets(pages, false);
    }
};

/** The size of one board panel without bleed, in whole mm, from the board profile (bug 22 of test round 3). */
export const panelSize = (
    profile: BoardProfile,
): {
    w: number;
    h: number;
    count: number;
} => {
    const panels = splitPanels(profile);
    const first = panels[0];

    return {
        w: first === undefined ? 0 : Math.round(first.trim.w * 10) / 10,
        h: first === undefined ? 0 : Math.round(first.trim.h * 10) / 10,
        count: panels.length,
    };
};

export type SetEstimate = {
    /** Sheets per paper size, summed over the parts. */
    sheets: Partial<Record<Paper, number>>;
    /** Sheets of play money, so the bar can say how much of the total it is. */
    moneySheets: number;
    /** The paper the money is printed on. */
    moneyPaper: Paper | null;
    /** What is ordered per piece at the print shop. */
    pieces: Partial<Record<Exclude<QuantityUnit, 'sheet'>, number>>;
};

/**
 * The total of a set over the chosen parts, times the number of sets (Sanne's class set). The invitations are for the
 * party, not for each set: their number is chosen on its own (B244).
 */
export const setEstimate = (
    quantities: readonly { part: PrintPart; quantity: PartQuantity }[],
    copies: number,
): SetEstimate => {
    const estimate: SetEstimate = {
        sheets: {},
        moneySheets: 0,
        moneyPaper: null,
        pieces: {},
    };

    for (const { part, quantity } of quantities) {
        const count = quantity.count * (part === 'invitation' ? 1 : copies);

        if (quantity.unit === 'sheet') {
            const paper = quantity.paper ?? 'A4';

            estimate.sheets[paper] = (estimate.sheets[paper] ?? 0) + count;

            if (part === 'money') {
                estimate.moneySheets += count;
                estimate.moneyPaper = paper;
            }
        } else {
            estimate.pieces[quantity.unit] =
                (estimate.pieces[quantity.unit] ?? 0) + count;
        }
    }

    return estimate;
};

type Translate = (
    key: string,
    replacements?: Record<string, string | number>,
) => string;
type TranslateChoice = (
    key: string,
    count: number,
    replacements?: Record<string, string | number>,
) => string;

/** Parts whose PDF already holds every set (B242), and the invitations, which have their own number (B244). */
const COUNTED_IN_ALL: readonly PrintPart[] = [
    'cards',
    'money',
    'invitation',
    'calibration',
];

/**
 * The spec line of a row with more than one set: the number of one set, then what that is in all ("4 stuks per set,
 * 12 in totaal · elk …"), so a shop that copies the line orders every set (B250, Ingrid in round 6). The first part
 * of a spec line is always its count. The cards, the money and the invitations already count everything.
 */
export const withSetTotal = (
    spec: string,
    part: PrintPart,
    quantity: PartQuantity,
    copies: number,
    t: Translate,
): string => {
    if (copies < 2 || COUNTED_IN_ALL.includes(part)) {
        return spec;
    }

    const [first = '', ...rest] = spec.split(' · ');

    return [
        `${first}${t('print.spec.per_set_total', { total: quantity.count * copies })}`,
        ...rest,
    ].join(' · ');
};

const PAPER_ORDER: readonly Paper[] = ['A4', 'A3', 'SRA3'];

/**
 * "Samen 31 vellen A4 en 1 vel A3, waarvan 24 speelgeld": the line in the fixed bar of the print page. With more
 * than one set it also says how many notes that is in all (`notes`, UX 3 of test round 4: Hans counted ten sets).
 */
export const describeEstimate = (
    estimate: SetEstimate,
    copies: number,
    t: Translate,
    tc: TranslateChoice,
    notes = 0,
): string => {
    const pieces = (units: readonly Exclude<QuantityUnit, 'sheet'>[]) =>
        units.flatMap((unit) => {
            const count = estimate.pieces[unit] ?? 0;

            return count > 0 ? [tc(`print.qty.${unit}`, count)] : [];
        });
    // What a print shop sells per piece first (panels, cards, a booklet), then the sheets, then the rest.
    const items = [
        ...pieces(['panel', 'board', 'card', 'booklet']),
        ...PAPER_ORDER.flatMap((paper) => {
            const count = estimate.sheets[paper] ?? 0;

            return count > 0 ? [tc('print.qty.sheet', count, { paper })] : [];
        }),
        ...pieces(['invitation', 'piece']),
    ];
    const last = items.pop();

    if (last === undefined) {
        return t('print.estimate.none');
    }

    const list =
        items.length === 0
            ? last
            : `${items.join(', ')} ${t('print.estimate.and')} ${last}`;
    // "waarvan 24 speelgeld" only where the money shares its paper with other parts.
    const samePaper =
        estimate.moneyPaper === null
            ? 0
            : (estimate.sheets[estimate.moneyPaper] ?? 0);
    const money =
        estimate.moneySheets > 0 && estimate.moneySheets < samePaper
            ? t('print.estimate.money', { count: estimate.moneySheets })
            : '';

    const noteCount =
        copies > 1 && notes > 0
            ? t('print.estimate.notes', { count: notes })
            : '';

    return copies > 1
        ? t('print.estimate.many', { copies, list: list + money + noteCount })
        : t('print.estimate.one', { list: list + money });
};
