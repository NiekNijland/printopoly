import { runChecks } from '@/lib/checks/checks';
import { applyChanges } from '@/lib/edition/changes';
import { extraCardKeys } from '@/lib/edition/keys';
import { resolveEdition } from '@/lib/edition/resolve';
import { parseEdition } from '@/lib/edition/schema';
import type { Edition } from '@/lib/edition/types';
import { buildCheckInput } from '@/lib/editor/checks-input';
import { sampleEdition } from '@/testing/editions';

import {
    addCardChange,
    clearCardChange,
    nextExtraCardKey,
    removeCardChanges,
} from './extra-cards';

function withElements(elements: Edition['elements']): Edition {
    return { ...sampleEdition(), elements };
}

describe('extra cards (B135)', () => {
    it('adds empty cards after the 16 of a deck, up to 32', () => {
        let edition = withElements({});

        expect(nextExtraCardKey(edition, 'chance')).toBe('card.chance.17');
        for (let i = 0; i < 16; i++) {
            const added = addCardChange(edition, 'chance');
            expect(added).not.toBeNull();
            edition = applyChanges(edition, [added!.change]);
        }

        expect(extraCardKeys(edition.elements, 'chance')).toHaveLength(16);
        expect(edition.elements['card.chance.32']).toEqual({ added: true });
        expect(nextExtraCardKey(edition, 'chance')).toBeUndefined();
        expect(addCardChange(edition, 'chance')).toBeNull();
        expect(nextExtraCardKey(edition, 'chest')).toBe('card.chest.17');
    });

    it('takes a card out and moves the cards after it down, so the numbers stay without gaps', () => {
        const edition = withElements({
            'card.chance.17': { added: true, text: 'Een' },
            'card.chance.18': { added: true, text: 'Twee' },
            'card.chance.19': { added: true, text: 'Drie', amount: -20 },
        });

        const next = applyChanges(
            edition,
            removeCardChanges(edition, 'card.chance.18'),
        );

        expect(next.elements['card.chance.17']?.text).toBe('Een');
        expect(next.elements['card.chance.18']).toEqual({
            added: true,
            text: 'Drie',
            amount: -20,
        });
        expect(next.elements['card.chance.19']).toBeUndefined();
        expect(removeCardChanges(edition, 'card.chance.03')).toEqual([]);
    });

    it('puts an extra card back to an empty card instead of taking it out', () => {
        const edition = withElements({
            'card.chest.17': { added: true, text: 'Een', amount: 40 },
        });

        const change = clearCardChange(edition, 'card.chest.17');

        expect(change?.after).toEqual({ added: true });
    });

    it('resolves extra cards into their deck with a free amount and no standard text', () => {
        const resolved = resolveEdition(
            withElements({
                'card.chance.17': {
                    added: true,
                    text: 'Je wint de pubquiz.',
                    amount: 75,
                },
                'card.chance.18': { added: true, amount: 900 },
            }),
        );
        const deck = resolved.decks?.chance ?? [];

        expect(deck).toHaveLength(18);
        expect(deck[16]).toMatchObject({
            id: 'chance.17',
            extra: true,
            text: 'Je wint de pubquiz.',
            amount: 75,
            lineAmount: 75,
            standardAmount: undefined,
            originalText: '',
        });
        // An amount above 500 never prints.
        expect(deck[17]?.amount).toBeUndefined();
        expect(deck[0]?.extra).toBe(false);
    });

    it('checks an extra card in the browser like the server does', () => {
        const valid = parseEdition(
            withElements({
                'card.chance.17': { added: true, amount: -500 },
            }),
        );
        expect(valid.ok).toBe(true);

        for (const [key, override] of [
            ['card.chance.33', { added: true }],
            ['card.chance.17', { text: 'Hoi' }],
            ['card.chance.03', { added: true }],
            ['card.chance.17', { added: true, amount: 501 }],
            ['card.chance.17', { added: true, amount: 0 }],
        ] as const) {
            const result = parseEdition(withElements({ [key]: override }));
            expect({ key, ok: result.ok }).toEqual({ key, ok: false });
        }
    });

    it('warns in the Controle about an extra card without a text', () => {
        const edition = withElements({
            'card.chance.17': { added: true },
            'card.chance.18': { added: true, text: 'Hoi' },
        });

        const issues = runChecks(
            buildCheckInput(edition, new Map(), new Map()),
        );
        const empty = issues.filter((issue) => issue.code === 'card.empty');

        expect(empty.map((issue) => issue.elementKey)).toEqual([
            'card.chance.17',
        ]);
        expect(empty[0]?.message.nl).toContain('nog geen tekst');
    });
});
