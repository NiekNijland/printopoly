import { setElement } from '@/lib/render/edition-changes';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import { makeEdition, photo } from '@/testing/edition-test-utils';

import { lookupResolved } from './lookup';

const ALL_PARTS = {
    board: true,
    deeds: true,
    cards: true,
    money: true,
    pawns: true,
    boxLid: true,
    houseRules: true,
    rulesBooklet: true,
    invitation: true,
};

const KEYS = [
    'space.01',
    'space.39',
    'deed.01',
    'card.chance.03',
    'card.chest.02',
    'card_back.chance',
    'card_back.chest',
    'card_back.deed',
    'note.500',
    'pawn.02',
    'box_lid',
    'board_center',
    'house_rules',
    'rules_booklet',
    'invitation',
];

const withPhotos = (edition: Edition): Edition =>
    KEYS.reduce(
        (current, key) =>
            setElement(current, key, { photo: photo(`photo-${key}`) }).edition,
        edition,
    );

describe('lookupResolved', () => {
    it('finds the photo of every kind of element', () => {
        const resolved = resolveEdition(
            withPhotos(makeEdition({ parts: ALL_PARTS })),
        );

        for (const key of KEYS) {
            expect(lookupResolved(resolved, key)?.photo?.photoId).toBe(
                `photo-${key}`,
            );
        }
    });

    it('gives nothing for the elements of a part that is off', () => {
        const resolved = resolveEdition(
            withPhotos(
                makeEdition({
                    parts: {
                        ...ALL_PARTS,
                        deeds: false,
                        cards: false,
                        money: false,
                        pawns: false,
                        boxLid: false,
                        houseRules: false,
                        rulesBooklet: false,
                        invitation: false,
                    },
                }),
            ),
        );

        for (const key of [
            'deed.01',
            'card.chance.03',
            'card_back.chance',
            'card_back.deed',
            'note.500',
            'pawn.02',
            'box_lid',
            'house_rules',
            'rules_booklet',
            'invitation',
        ]) {
            expect(lookupResolved(resolved, key)).toBeUndefined();
        }
        expect(lookupResolved(resolved, 'space.01')?.photo?.photoId).toBe(
            'photo-space.01',
        );
    });

    it('gives nothing for a key it does not know or a missing element', () => {
        const resolved = resolveEdition(makeEdition({ parts: ALL_PARTS }));

        expect(lookupResolved(resolved, 'group.brown')).toBeUndefined();
        expect(lookupResolved(resolved, '')).toBeUndefined();
        expect(lookupResolved(resolved, 'note.3')).toBeUndefined();
        expect(lookupResolved(resolved, 'pawn.99')).toBeUndefined();
        expect(lookupResolved(resolved, 'card.joker.01')).toBeUndefined();
    });

    it('gives an element without a photo as such', () => {
        const resolved = resolveEdition(makeEdition({ parts: ALL_PARTS }));

        expect(lookupResolved(resolved, 'space.05')).toMatchObject({
            photo: undefined,
        });
    });
});
