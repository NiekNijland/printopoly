import type { Localized } from '../../types/game';
import type { CheckCode, CheckIssue } from './checks-types';

/** One row of a list of messages: one message, or many of the same kind as one row (R5-13). */
export type ListedIssue = {
    /** The message the row opens: the first of the kind. */
    issue: CheckIssue;
    /** How many messages the row stands for. */
    count: number;
    message: Localized;
};

/** From this many messages of one kind the list shows one row for them. */
const GROUP_FROM = 3;

/**
 * Kinds of messages that come in bulk when an edition is emptied on purpose, with the one row they get. Emma
 * cleared every name and card for a class that writes its own and got 60 rows of "no text yet" (R5-13).
 */
const GROUPED: Partial<Record<CheckCode, (count: number) => Localized>> = {
    'card.empty': (count) => ({
        nl: `${String(count)} kaarten hebben nog geen tekst. Wil je ze leeg printen, om zelf op te schrijven? Dan is dit goed zo. Anders schrijf je er iets op of zet je ze terug naar standaard.`,
        en: `${String(count)} cards have no text yet. Printing them empty, to write on yourself? Then this is fine. Otherwise write something on them or set them back to standard.`,
    }),
    'space.no-name': (count) => ({
        nl: `${String(count)} vakken hebben nog geen naam. Wil je ze leeg printen, om zelf in te vullen? Dan is dit goed zo. Anders schrijf je er een naam op of zet je ze terug naar standaard.`,
        en: `${String(count)} spaces have no name yet. Printing them empty, to fill in yourself? Then this is fine. Otherwise give them a name or set them back to standard.`,
    }),
};

/**
 * The messages as rows for a list (the editor's list behind C and "Nog even nakijken" on the print page): many of
 * the same kind become one row where the first of them stood, the rest stay as they are. The field panel of an
 * element keeps its own message.
 */
export const listIssues = (issues: readonly CheckIssue[]): ListedIssue[] => {
    const counts = new Map<CheckCode, number>();
    for (const issue of issues) {
        counts.set(issue.code, (counts.get(issue.code) ?? 0) + 1);
    }
    const listed: ListedIssue[] = [];
    const grouped = new Set<CheckCode>();
    for (const issue of issues) {
        const group = GROUPED[issue.code];
        const count = counts.get(issue.code) ?? 1;
        if (group === undefined || count < GROUP_FROM) {
            listed.push({ issue, count: 1, message: issue.message });
        } else if (!grouped.has(issue.code)) {
            grouped.add(issue.code);
            listed.push({ issue, count, message: group(count) });
        }
    }

    return listed;
};
