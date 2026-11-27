import { describe, expect, it } from 'vitest';

import { TEMPLATE_IDS } from '@/lib/render/edition-template-ids';
import { templateEdition } from '@/lib/render/edition-templates';
import { DEFAULT_PARTS, type Edition } from '@/lib/render/edition-types';
import { defined } from '@/testing/defined';
import { makeEdition } from '@/testing/edition-test-utils';

import { checkView, editorView, partsInSet } from './editor-print-selection';

const withSelection = (parts: unknown): Edition => {
    return Object.assign(makeEdition(), {
        printSelection: { set: 'home', parts },
    });
};

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
        expect(view.parts.board).toBe(true);
    });
});

describe('the last chosen set', () => {
    it('has the set the print page opens with before it saved a choice: board and cards (R5-20, B225)', () => {
        const edition = makeEdition();

        expect([...partsInSet(edition)].sort()).toEqual(
            ['board', 'cards', 'deeds', 'houseRules'].sort(),
        );
        expect(partsInSet(edition).has('money')).toBe(false);
        expect(partsInSet(edition).has('boxLid')).toBe(false);
        expect(partsInSet(edition).has('invitation')).toBe(false);
        expect(partsInSet(edition).has('pawns')).toBe(false);
    });

    it('agrees with the print page for an older edition that switched parts on itself', () => {
        const edition = {
            ...makeEdition(),
            parts: { ...DEFAULT_PARTS, money: true, pawns: true },
        };

        expect(partsInSet(edition).has('money')).toBe(true);
        expect(partsInSet(edition).has('pawns')).toBe(true);
        expect(partsInSet(edition).has('boxLid')).toBe(false);
    });

    it('gives a template edition the same set as a blank one (R5-20, B225)', () => {
        for (const id of TEMPLATE_IDS) {
            const edition = templateEdition(id, 'nl');

            expect(edition).toBeDefined();
            expect([...partsInSet(defined(edition))].sort()).toEqual(
                [...partsInSet(makeEdition())].sort(),
            );
        }
    });

    it('reads the parts the print page chose, and always the board', () => {
        const edition = withSelection(['deeds', 'cards']);

        expect(partsInSet(edition).has('cards')).toBe(true);
        expect(partsInSet(edition).has('money')).toBe(false);
        expect(checkView(edition).parts.board).toBe(true);
    });

    it('ignores what it cannot read instead of crashing', () => {
        expect(partsInSet(withSelection('cards')).has('cards')).toBe(true);
        expect(partsInSet(withSelection('cards')).has('money')).toBe(false);
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
