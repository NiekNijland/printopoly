import { applyChanges } from '@/lib/render/edition-changes';
import { makeEdition } from '@/testing/edition-test-utils';

import { isNameable, matchesQuery, pasteNames } from './name-list';

describe('isNameable', () => {
    it('lets spaces and pawns be named, but not Chance, Community Chest or other rows', () => {
        expect(isNameable('space.01')).toBe(true);
        expect(isNameable('space.05')).toBe(true);
        expect(isNameable('space.00')).toBe(true);
        expect(isNameable('pawn.03')).toBe(true);
        expect(isNameable('space.02')).toBe(false);
        expect(isNameable('space.07')).toBe(false);
        expect(isNameable('card.chance.01')).toBe(false);
        expect(isNameable('box_lid')).toBe(false);
    });
});

describe('pasteNames', () => {
    it('treats one line as ordinary typing', () => {
        expect(
            pasteNames(makeEdition(), 'space.01', 'Molenweg\n\n  '),
        ).toBeNull();
    });

    it('fills the row and the next streets, and counts the spaces it passed over', () => {
        const edition = makeEdition();

        const pasted = pasteNames(
            edition,
            'space.01',
            ' Molenweg \r\nKerkstraat\rDorpsplein',
        );

        expect(pasted?.keys).toEqual(['space.01', 'space.03', 'space.06']);
        expect(pasted?.left).toBe(0);
        expect(pasted?.skipped).toBe(2);
        const after = applyChanges(edition, pasted?.changes ?? []);
        expect(after.elements['space.01']?.name).toBe('Molenweg');
        expect(after.elements['space.03']?.name).toBe('Kerkstraat');
        expect(after.elements['space.06']?.name).toBe('Dorpsplein');
    });

    it('fills the next stations only and says how many lines were left', () => {
        const pasted = pasteNames(
            makeEdition(),
            'space.25',
            'Bushalte\nVeerpont\nTreinstation',
        );

        expect(pasted?.keys).toEqual(['space.25', 'space.35']);
        expect(pasted?.left).toBe(1);
    });

    it('fills the next pawns that are shown, from the row pasted in', () => {
        const edition = makeEdition();
        edition.elements['pawn.03'] = { hidden: true };

        const pasted = pasteNames(edition, 'pawn.02', 'Fiets\nBoot\nTrein');

        expect(pasted?.keys).toEqual(['pawn.02', 'pawn.04', 'pawn.05']);
        expect(pasted?.skipped).toBe(0);
    });

    it('starts with the first pawn when the row is a hidden one', () => {
        const edition = makeEdition();
        edition.elements['pawn.08'] = { hidden: true };

        expect(pasteNames(edition, 'pawn.08', 'A\nB')?.keys).toEqual([
            'pawn.01',
            'pawn.02',
        ]);
    });

    it('cuts a line to the longest name and keeps a name that does not change', () => {
        const edition = makeEdition();
        edition.elements['space.03'] = { name: 'Kerkstraat' };

        const pasted = pasteNames(
            edition,
            'space.01',
            `${'x'.repeat(130)}\nKerkstraat`,
        );

        expect(pasted?.changes).toHaveLength(1);
        expect(pasted?.changes[0]?.after?.name).toHaveLength(120);
    });

    it('fills nothing for a row that has no name', () => {
        expect(pasteNames(makeEdition(), 'box_lid', 'A\nB')).toEqual({
            changes: [],
            keys: [],
            left: 2,
            skipped: 0,
        });
    });
});

describe('matchesQuery', () => {
    it('matches everything for an empty query', () => {
        expect(matchesQuery('  ')).toBe(true);
    });

    it('finds the query in any text, without case or accents', () => {
        expect(matchesQuery('CAFE', undefined, 'Het Café')).toBe(true);
        expect(matchesQuery(' été ', 'Ete')).toBe(true);
        expect(matchesQuery('molen', 'Kerkstraat', undefined)).toBe(false);
    });
});
