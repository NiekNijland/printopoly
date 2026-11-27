import { describe, expect, it } from 'vitest';
import { checkEmptyCards, checkEmptyNames } from './checks';
import { checkText } from './checks-element';
import { issuesFor, listIssues, summarize } from './checks-summary';

const long = (key: string, field = 'text') =>
    checkText(key, { field, fit: { fits: false, excessCharacters: 5 } });

describe('summarize', () => {
    it('says nothing found and what was checked, as in the design', () => {
        const s = summarize([], 'nl');
        expect(s.label).toBe(
            'Controle: niets gevonden. Gecontroleerd: fotoscherpte, tekst en bordmaat.',
        );
        expect(s.count).toBe(0);
        expect(summarize([], 'en').label).toBe(
            'Check: nothing found. Checked: photo sharpness, text and board size.',
        );
    });

    it('shows the count like the editor header', () => {
        const issues = [...long('a'), ...long('b')];
        expect(summarize(issues, 'nl')).toMatchObject({
            label: 'Controle: 2',
            count: 2,
            warnings: 2,
            errors: 0,
        });
        expect(summarize(issues, 'en').label).toBe('Check: 2');
    });
});

describe('issuesFor', () => {
    it('selects the issues for an element, optionally one field', () => {
        const issues = [
            ...long('a', 'name'),
            ...long('a', 'text'),
            ...long('b'),
        ];
        expect(issuesFor(issues, 'a')).toHaveLength(2);
        expect(issuesFor(issues, 'a', 'name')).toHaveLength(1);
        expect(issuesFor(issues, 'c')).toEqual([]);
    });
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
            ...checkEmptyNames(names),
            ...checkEmptyCards(cards),
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
        const rows = listIssues(checkEmptyCards(cards.slice(0, 2)));

        expect(rows).toHaveLength(2);
        expect(rows.every((row) => row.count === 1)).toBe(true);
    });
});
