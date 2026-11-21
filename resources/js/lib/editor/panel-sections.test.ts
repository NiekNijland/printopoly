import { sampleEdition } from '@/testing/editions';

import {
    canReset,
    panelActions,
    panelSections,
    resetLosesPhoto,
} from './panel-sections';

const photo = {
    photoId: 'p1',
    cx: 0.5,
    cy: 0.5,
    scale: 1,
    rotation: 0,
    grayscale: false,
};

describe('panelSections (B141, §3.3)', () => {
    it.each([
        ['street', 'space.01', ['text', 'image', 'amounts', 'style']],
        [
            'title deed of a street',
            'deed.01',
            ['text', 'image', 'amounts', 'style'],
        ],
        ['station', 'space.05', ['text', 'image', 'amounts']],
        ['utility', 'space.12', ['text', 'image', 'amounts']],
        ['tax', 'space.04', ['text', 'image', 'amounts']],
        ['Chance space', 'space.07', ['text', 'image']],
        ['Community Chest space', 'space.02', ['text', 'image']],
        ['Start, with its salary', 'space.00', ['text', 'image', 'amounts']],
        ['another corner', 'space.20', ['text', 'image']],
        ['board centre', 'board_center', ['text', 'image', 'style']],
        ['card with an amount', 'card.chance.12', ['text', 'image', 'amounts']],
        ['card without an amount', 'card.chance.01', ['text', 'image']],
        ['extra card', 'card.chest.17', ['text', 'image', 'amounts']],
        ['card back', 'card_back.chance', ['image', 'style']],
        ['note', 'note.50', ['text', 'image', 'amounts', 'style']],
        ['pawn', 'pawn.03', ['text', 'image']],
        ['box lid', 'box_lid', ['text', 'image', 'style']],
        ['house rules', 'house_rules', ['text', 'image']],
        ['invitation', 'invitation', ['text', 'image']],
        ['rules booklet', 'rules_booklet', ['image']],
        ['houses and hotels', 'fold_models', ['image']],
        ['dice', 'dice', ['image']],
        ['colours of the edition', 'theme_accent', ['style']],
    ])('gives a %s its sections in the fixed order', (_, key, sections) => {
        expect(panelSections(key)).toEqual(sections);
    });

    it('has no sections for a key that is no element of the panel', () => {
        expect(panelSections('group.brown')).toEqual([]);
        expect(panelSections('nonsense')).toEqual([]);
    });
});

describe('panelActions', () => {
    it('offers Terug naar standaard only when the element differs (B142)', () => {
        const edition = {
            ...sampleEdition(),
            elements: { 'space.01': { name: 'Dorpsstraat' } },
        };

        expect(panelActions('space.01', edition)).toEqual(['reset', 'swap']);
        expect(panelActions('space.03', edition)).toEqual(['swap']);
    });

    it('offers Wisselen met… on streets, stations and utilities only', () => {
        const edition = sampleEdition();

        expect(panelActions('space.05', edition)).toEqual(['swap']);
        expect(panelActions('space.12', edition)).toEqual(['swap']);
        expect(panelActions('space.00', edition)).toEqual([]);
        expect(panelActions('space.04', edition)).toEqual([]);
        expect(panelActions('deed.01', edition)).toEqual([]);
    });

    it('takes a pawn out, and an extra card but never a standard one (B135)', () => {
        const edition = {
            ...sampleEdition({ parts: { pawns: true } }),
            elements: {
                'card.chance.17': { added: true },
                'card.chance.18': { added: true, text: 'Hoi' },
            },
        };

        expect(panelActions('pawn.02', edition)).toEqual(['removePawn']);
        expect(panelActions('card.chance.17', edition)).toEqual(['removeCard']);
        expect(panelActions('card.chance.18', edition)).toEqual([
            'reset',
            'removeCard',
        ]);
        expect(panelActions('card.chance.03', edition)).toEqual([]);
    });

    it('leaves the colours of the edition to their own panel', () => {
        expect(canReset('theme_accent', { color: '#123456' })).toBe(false);
    });
});

describe('resetLosesPhoto', () => {
    it('asks first when a photo, a background, an uploaded icon or a photo layer goes', () => {
        expect(resetLosesPhoto(undefined)).toBe(false);
        expect(resetLosesPhoto({ name: 'A' })).toBe(false);
        expect(resetLosesPhoto({ photo })).toBe(true);
        expect(resetLosesPhoto({ background: photo })).toBe(true);
        expect(resetLosesPhoto({ icon: { aspect: 1, photo } })).toBe(true);
        expect(resetLosesPhoto({ icon: { preset: 'train' } })).toBe(false);
        expect(
            resetLosesPhoto({
                layers: [
                    {
                        id: 'l1',
                        kind: 'photo',
                        x: 0,
                        y: 0,
                        w: 10,
                        h: 10,
                        photo,
                    },
                ],
            }),
        ).toBe(true);
    });
});
