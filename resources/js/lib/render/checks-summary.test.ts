import { describe, expect, it } from 'vitest';
import { runChecks } from './checks';
import { checkElement } from './checks-element';
import { listIssues } from './checks-summary';
import { DEFAULT_BOARD_PROFILE } from './print-board';

const long = (key: string, field = 'text') =>
    checkElement({
        key,
        texts: [{ field, fit: { fits: false, excessCharacters: 5 } }],
    });

const empty = (emptyNames: readonly string[], emptyCards: readonly string[]) =>
    runChecks({
        board: DEFAULT_BOARD_PROFILE,
        parts: {
            board: true,
            titleDeeds: true,
            cards: true,
            money: false,
            tokens: false,
            boxLid: false,
            houseRules: false,
        },
        elements: [],
        emptyNames,
        emptyCards,
    });

describe('listIssues (R5-13)', () => {
    const cards = Array.from(
        { length: 32 },
        (_, i) => `card.chance.${String(i + 1).padStart(2, '0')}`,
    );
    const names = ['space.01', 'space.03', 'space.06', 'space.08'];

    it('makes one row of many empty cards and one of many empty names, where the first stood', () => {
        const rows = listIssues([
            ...long('space.11'),
            ...empty(names, []),
            ...empty([], cards),
            ...long('pawn.1'),
        ]);

        expect(rows.map((row) => [row.issue.elementKey, row.count])).toEqual([
            ['space.11', 1],
            ['space.01', 4],
            ['card.chance.01', 32],
            ['pawn.1', 1],
        ]);
        expect(rows[1]?.message.nl).toBe(
            '4 vakken hebben nog geen naam. Wil je ze leeg printen, om zelf in te vullen? Dan is dit goed zo. Anders schrijf je er een naam op of zet je ze terug naar standaard.',
        );
        expect(rows[2]?.message.en).toMatch(/^32 cards have no text yet\./);
    });

    it('keeps a few empty cards as their own rows', () => {
        const rows = listIssues(empty([], cards.slice(0, 2)));

        expect(rows).toHaveLength(2);
        expect(rows.every((row) => row.count === 1)).toBe(true);
    });
});
