import { describe, expect, it } from 'vitest';

import { templateEdition, TEMPLATE_IDS } from '@/lib/render/edition-templates';
import { DEFAULT_PARTS, type Edition } from '@/lib/render/edition-types';
import { makeEdition } from '@/testing/edition-test-utils';

import {
    EDITOR_PARTS,
    checkView,
    editorView,
    inSet,
    partsInSet,
} from './editor-print-selection';

const withSelection = (parts: unknown): Edition => {
    return {
        ...makeEdition(),
        printSelection: { set: 'home', parts },
    } as Edition;
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
        expect(EDITOR_PARTS.board).toBe(true);
    });
});

describe('the last chosen set', () => {
    it('has the set the print page opens with before it saved a choice: board and cards (R5-20, B225)', () => {
        const edition = makeEdition();

        expect([...partsInSet(edition)].sort()).toEqual(
            ['board', 'cards', 'deeds', 'houseRules'].sort(),
        );
        expect(inSet(edition, 'money')).toBe(false);
        expect(inSet(edition, 'boxLid')).toBe(false);
        expect(inSet(edition, 'invitation')).toBe(false);
        expect(inSet(edition, 'pawns')).toBe(false);
    });

    it('agrees with the print page for an older edition that switched parts on itself', () => {
        const edition = {
            ...makeEdition(),
            parts: { ...DEFAULT_PARTS, money: true, pawns: true },
        };

        expect(inSet(edition, 'money')).toBe(true);
        expect(inSet(edition, 'pawns')).toBe(true);
        expect(inSet(edition, 'boxLid')).toBe(false);
    });

    it('gives a template edition the same set as a blank one (R5-20, B225)', () => {
        for (const id of TEMPLATE_IDS) {
            const edition = templateEdition(id, 'nl');

            expect(edition).toBeDefined();
            expect([...partsInSet(edition!)].sort()).toEqual(
                [...partsInSet(makeEdition())].sort(),
            );
        }
    });

    it('reads the parts the print page chose, and always the board', () => {
        const edition = withSelection(['deeds', 'cards']);

        expect(inSet(edition, 'cards')).toBe(true);
        expect(inSet(edition, 'money')).toBe(false);
        expect(inSet(edition, 'board')).toBe(true);
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
