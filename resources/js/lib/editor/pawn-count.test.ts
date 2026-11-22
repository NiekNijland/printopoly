import { applyChanges } from '@/lib/edition/changes';
import { makeEdition } from '@/lib/edition/test-utils';
import type { Edition } from '@/lib/edition/types';

import { pawnCountChanges, visiblePawnKeys } from './pawn-count';

const withPawns = (): Edition => ({
    ...makeEdition({ parts: { pawns: true } }),
    elements: { 'pawn.02': { name: 'Oma Ria' } },
});

describe('the number of pawns as one field (UX 9)', () => {
    it('takes out the last pawns, in one step, and keeps what they have', () => {
        const edition = withPawns();
        const changes = pawnCountChanges(edition, 5);
        const next = applyChanges(edition, changes);

        expect(changes).toHaveLength(3);
        expect(visiblePawnKeys(next)).toEqual([
            'pawn.01',
            'pawn.02',
            'pawn.03',
            'pawn.04',
            'pawn.05',
        ]);
        expect(next.elements['pawn.02']?.name).toBe('Oma Ria');
    });

    it('puts pawns back, first the lowest numbers', () => {
        const edition = applyChanges(
            withPawns(),
            pawnCountChanges(withPawns(), 2),
        );
        const next = applyChanges(edition, pawnCountChanges(edition, 4));

        expect(visiblePawnKeys(next)).toEqual([
            'pawn.01',
            'pawn.02',
            'pawn.03',
            'pawn.04',
        ]);
    });

    it('keeps the set Pion 1 to n, also with a later pawn on screen, and stays between 2 and 8 (bug 27)', () => {
        const edition = withPawns();
        const next = applyChanges(edition, pawnCountChanges(edition, 2));

        expect(visiblePawnKeys(next)).toEqual(['pawn.01', 'pawn.02']);
        expect(pawnCountChanges(edition, 12)).toEqual([]);
        expect(
            visiblePawnKeys(
                applyChanges(edition, pawnCountChanges(edition, 0)),
            ),
        ).toHaveLength(2);
    });
});
