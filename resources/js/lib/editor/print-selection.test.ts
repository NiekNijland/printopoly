import { describe, expect, it } from 'vitest';

import { makeEdition } from '@/lib/edition/test-utils';
import { DEFAULT_PARTS, type Edition } from '@/lib/edition/types';

import {
    EDITOR_PARTS,
    checkView,
    editorView,
    inSet,
    partsInSet,
} from './print-selection';

function withSelection(parts: unknown): Edition {
    return {
        ...makeEdition(),
        printSelection: { set: 'home', parts },
    } as Edition;
}

describe('the editor shows every part (B198)', () => {
    it('turns every part on, except the rules booklet that left the editor (B204)', () => {
        const view = editorView({
            ...makeEdition(),
            parts: { ...DEFAULT_PARTS },
        });

        expect(view.parts.money).toBe(true);
        expect(view.parts.pawns).toBe(true);
        expect(view.parts.invitation).toBe(true);
        expect(view.parts.rulesBooklet).toBe(false);
        expect(EDITOR_PARTS.board).toBe(true);
    });
});

describe('the last chosen set', () => {
    it('has every part without a choice on the print page', () => {
        const edition = makeEdition();

        expect(partsInSet(edition).has('money')).toBe(true);
        expect(inSet(edition, 'invitation')).toBe(true);
    });

    it('reads the parts the print page chose, and always the board', () => {
        const edition = withSelection(['deeds', 'cards']);

        expect(inSet(edition, 'cards')).toBe(true);
        expect(inSet(edition, 'money')).toBe(false);
        expect(inSet(edition, 'board')).toBe(true);
    });

    it('ignores what it cannot read instead of crashing', () => {
        expect(partsInSet(withSelection('cards')).has('money')).toBe(true);
        expect([...partsInSet(withSelection(['cards', 7, 'nope']))]).toEqual([
            'cards',
        ]);
    });

    it('only checks the parts of the set, so a part you do not print gives no messages (B197)', () => {
        const parts = checkView(withSelection(['cards'])).parts;

        expect(parts.board).toBe(true);
        expect(parts.cards).toBe(true);
        expect(parts.money).toBe(false);
    });
});
