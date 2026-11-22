/**
 * Which editions this browser printed (R6 Kees, B261): the print page writes it when every part of a set is
 * made, so Mijn edities and "Verder met" can say "Geprint" or "Nog niet geprint" also after the files are gone
 * (they stay 7 days). A convenience in this browser only: reading and writing never throw.
 */

const KEY = 'printopoly.printed';

export interface PrintedMark {
    /** When the set was ready, in ms. */
    at: number;
    /** The revision of the edition the set was made from: a later revision was changed after printing. */
    revision: number;
}

export type PrintedMarks = Readonly<Record<string, PrintedMark>>;

function isMark(value: unknown): value is PrintedMark {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as PrintedMark).at === 'number' &&
        typeof (value as PrintedMark).revision === 'number'
    );
}

export function readPrinted(): PrintedMarks {
    try {
        const parsed: unknown = JSON.parse(
            window.localStorage.getItem(KEY) ?? '{}',
        );
        if (typeof parsed !== 'object' || parsed === null) {
            return {};
        }

        return Object.fromEntries(
            Object.entries(parsed).filter(([, mark]) => isMark(mark)),
        ) as PrintedMarks;
    } catch {
        return {};
    }
}

export function markPrinted(editionId: string, mark: PrintedMark): void {
    try {
        const marks = readPrinted();
        const known = marks[editionId];
        if (
            known !== undefined &&
            known.revision === mark.revision &&
            known.at <= mark.at
        ) {
            return;
        }
        window.localStorage.setItem(
            KEY,
            JSON.stringify({ ...marks, [editionId]: mark }),
        );
    } catch {
        // Private window or full storage: the list says nothing about printing.
    }
}

/** How an edition stands: never printed, printed as it is, or changed after printing. */
export type PrintedState =
    | { kind: 'never' }
    | { kind: 'printed'; at: number }
    | { kind: 'changed'; at: number };

export function printedState(
    marks: PrintedMarks,
    editionId: string,
    revision: number,
): PrintedState {
    const mark = marks[editionId];
    if (mark === undefined) {
        return { kind: 'never' };
    }

    return mark.revision >= revision
        ? { kind: 'printed', at: mark.at }
        : { kind: 'changed', at: mark.at };
}
