import { DEFAULT_INVITATIONS } from '@/features/print/estimate';
import { readStored, writeStored } from '@/lib/browser-storage';
import type { EditionStorage } from '@/lib/render/edition-storage';
import type {
    Edition,
    Elements,
    PrintSelection,
} from '@/lib/render/edition-types';
import type { LocalEditionUpload } from '@/lib/render/print-api';
import type { PrintEdition } from '@/lib/render/print-composition';
import type { MoneyAmount } from '@/lib/render/print-money';
import { SET_PARTS, type SetPart } from '@/lib/render/print-selection';
import type {
    BoardForm,
    PrintJobData,
    PrintPart,
    PrintSet,
} from '@/types/generated';

/**
 * The parts of the game itself and the extra printing, in the order they sit on the page (B149). Every part is
 * always there as a row: the print page is the one place that chooses what goes in the set (B198). The dice and
 * the houses and hotels are gone (B200).
 */
export const GAME_PARTS: SetPart[] = [
    'board',
    'cards',
    'money',
    'tokens',
    'box_lid',
];

export const EXTRA_PARTS: SetPart[] = ['invitation', 'rules_booklet'];

/** The row the editor asked for with `?part=` (R6 Kees); read once, then taken out of the address. */
export const readAskedPart = (): SetPart | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    const url = new URL(window.location.href);
    const asked = url.searchParams.get('part');
    if (asked === null) {
        return null;
    }
    url.searchParams.delete('part');
    window.history.replaceState(window.history.state, '', url.toString());

    return SET_PARTS.find((part) => part === asked) ?? null;
};

/** Seconds to wait after "too many requests" when the server does not say (bug 4 of test round 3). */
export const THROTTLE_WAIT = 60;

/** What the page chose for one set: kept on the job, so a reload shows it again (bug 6 of test round 3). */
export type Choice = {
    skipped: PrintPart[];
    /** Null keeps the choice of the edition, or the default of the set (B156). */
    moneyAmount: MoneyAmount | null;
    copies: number;
    /** How the print shop delivers the board (B243); the home set always makes stickers. */
    boardForm: BoardForm;
    /** How many invitations the set counts with (B244). */
    invitations: number;
};

export const NO_CHOICE: Choice = {
    skipped: [],
    moneyAmount: null,
    copies: 1,
    boardForm: 'panels',
    invitations: DEFAULT_INVITATIONS,
};

const SET_KEY = 'printopoly.print-set.';

/**
 * The tab to open: the set in `?set=` (set after making a set), so you land on the set you made; otherwise the
 * set this browser chose for the edition, and else the home set (B199). The edition itself keeps its choice in
 * `printSelection` too; the page switches to it once the edition has loaded (`setFromEdition`).
 */
export const initialSet = (editionId: string | null): PrintSet => {
    if (typeof window === 'undefined') {
        return 'home';
    }
    const asked = new URLSearchParams(window.location.search).get('set');
    if (asked !== null) {
        return asked === 'printer' ? 'printer' : 'home';
    }
    const own = editionId === null ? null : readStored(SET_KEY + editionId);

    return own === 'printer' ? 'printer' : 'home';
};

/** Whether the address names a set, which then wins over what the edition remembers. */
export const setInUrl = (): boolean => {
    return (
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('set')
    );
};

export const rememberSet = (editionId: string | null, set: PrintSet): void => {
    // Without storage the page opens on the home set, as for a new edition.
    if (editionId !== null) {
        writeStored(SET_KEY + editionId, set);
    }
};

export const initialChoices = (
    job: PrintJobData | null,
): Record<PrintSet, Choice> => {
    const of = (set: PrintSet): Choice => {
        const kept = job?.choices[set];

        return kept === undefined
            ? NO_CHOICE
            : {
                  skipped: kept.skipped,
                  moneyAmount: kept.moneyAmount ?? null,
                  copies: kept.copies,
                  boardForm: kept.boardForm,
                  invitations: kept.invitations,
              };
    };

    return { printer: of('printer'), home: of('home') };
};

/**
 * The edition as the page counts it: the parts it prints, the money chosen for the set, the form of the board (B243)
 * and the number of invitations (B244).
 */
export const printEditionOf = (
    edition: Edition,
    moneyAmount: MoneyAmount,
    choice: Pick<Choice, 'boardForm' | 'invitations'> = NO_CHOICE,
): PrintEdition => {
    return {
        parts: edition.parts,
        boardProfile: edition.boardProfile,
        moneyAmount,
        boardForm: choice.boardForm,
        invitations: choice.invitations,
        elements: edition.elements,
    };
};

export type PrintServices = {
    loadEdition: () => Promise<Edition | undefined>;
    loadUpload: () => Promise<
        (LocalEditionUpload & { edition: Edition }) | null
    >;
    storage: () => Pick<EditionStorage, 'listPrintJobs' | 'getPhoto'>;
    rememberJob: (edition: Edition, token: string) => Promise<void>;
    carryJob: (
        token: string,
        editionId: string,
        fromRevision: number,
        toRevision: number,
    ) => Promise<void>;
    keepSelection: (
        id: string,
        selection: PrintSelection,
    ) => Promise<Edition | undefined>;
    photoIds: (elements: Elements) => Iterable<string>;
};
