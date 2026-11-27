/**
 * Which editions this browser printed (R6 Kees, B260): the print page writes it when every part of a set is
 * made, so Mijn edities and "Verder met" can say "Geprint" or "Nog niet geprint" also after the files are gone
 * (they stay 7 days). A convenience in this browser only: reading and writing never throw.
 */

import { readStored, writeStored } from '@/lib/browser-storage';
import { parseJson } from '@/lib/json';
import { is, number, object, record, type Parser } from '@/lib/parse';

const KEY = 'printopoly.printed';

export type PrintedMark = {
    /** When the set was ready, in ms. */
    at: number;
    /** The revision of the edition the set was made from: a later revision was changed after printing. */
    revision: number;
};

export type PrintedMarks = Readonly<Record<string, PrintedMark>>;

const printedMark: Parser<PrintedMark> = record({
    at: number,
    revision: number,
});

export const readPrinted = (): PrintedMarks => {
    const parsed = parseJson(readStored(KEY) ?? '{}');
    const marks: Record<string, PrintedMark> = {};
    if (!is(object, parsed)) {
        return marks;
    }
    for (const [editionId, value] of Object.entries(parsed)) {
        const mark = printedMark(value);
        if (mark.ok) {
            marks[editionId] = mark.value;
        }
    }

    return marks;
};

export const markPrinted = (editionId: string, mark: PrintedMark): void => {
    const marks = readPrinted();
    const known = marks[editionId];
    if (
        known !== undefined &&
        known.revision === mark.revision &&
        known.at <= mark.at
    ) {
        return;
    }
    // Private window or full storage: the list then says nothing about printing.
    writeStored(KEY, JSON.stringify({ ...marks, [editionId]: mark }));
};

/** How an edition stands: never printed, printed as it is, or changed after printing. */
export type PrintedState =
    | { kind: 'never' }
    | { kind: 'printed'; at: number }
    | { kind: 'changed'; at: number };

export const printedState = (
    marks: PrintedMarks,
    editionId: string,
    revision: number,
): PrintedState => {
    const mark = marks[editionId];
    if (mark === undefined) {
        return { kind: 'never' };
    }

    return mark.revision >= revision
        ? { kind: 'printed', at: mark.at }
        : { kind: 'changed', at: mark.at };
};
