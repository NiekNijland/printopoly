import { templateEdition } from '@/data/templates';
import { setElement, updateElement } from '@/lib/edition/changes';
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
    // Every space offers the style of the board in Stijl (B268); a deed only once the deeds have styles.
    it.each([
        ['street', 'space.01', ['text', 'image', 'amounts', 'style']],
        [
            'title deed of a street',
            'deed.01',
            ['text', 'image', 'amounts', 'style'],
        ],
        ['station', 'space.05', ['text', 'image', 'amounts', 'style']],
        ['utility', 'space.12', ['text', 'image', 'amounts', 'style']],
        ['tax', 'space.04', ['text', 'image', 'amounts', 'style']],
        ['Chance space', 'space.07', ['text', 'image', 'style']],
        ['Community Chest space', 'space.02', ['text', 'image', 'style']],
        [
            'Start, with its salary',
            'space.00',
            ['text', 'image', 'amounts', 'style'],
        ],
        ['another corner', 'space.20', ['text', 'image', 'style']],
        ['board centre', 'board_center', ['text', 'image', 'style']],
        ['card with an amount', 'card.chance.12', ['text', 'image', 'amounts']],
        ['card without an amount', 'card.chance.01', ['text', 'image']],
        ['extra card', 'card.chest.17', ['text', 'image', 'amounts']],
        ['card back', 'card_back.chance', ['image']],
        ['note', 'note.50', ['text', 'image', 'amounts', 'style']],
        ['pawn', 'pawn.03', ['text', 'image']],
        ['box lid', 'box_lid', ['text', 'image', 'style']],
        ['house rules', 'house_rules', ['text', 'image']],
        ['invitation', 'invitation', ['text', 'image']],
        ['rules booklet (B204: no element)', 'rules_booklet', []],
        ['houses and hotels (B200: gone)', 'fold_models', []],
        ['dice (B200: gone)', 'dice', []],
    ])('gives a %s its sections in the fixed order', (_, key, sections) => {
        expect(panelSections(key)).toEqual(sections);
    });

    it('has no sections for a key that is no element of the panel', () => {
        expect(panelSections('group.brown')).toEqual([]);
        // The colours of the edition live in the edition panel (B145).
        expect(panelSections('theme_accent')).toEqual([]);
        expect(panelSections('nonsense')).toEqual([]);
    });
});

describe('panelActions', () => {
    it('offers Terug naar standaard only when the element differs (B142)', () => {
        const edition = {
            ...sampleEdition(),
            elements: { 'space.01': { name: 'Dorpsstraat' } },
        };

        expect(panelActions('space.01', edition)).toEqual([
            'reset',
            'swap',
            'clearNames',
        ]);
        expect(panelActions('space.03', edition)).toEqual([
            'swap',
            'clearNames',
        ]);
    });

    it('offers Wisselen met… and Namen leegmaken on streets, stations and utilities only (B201)', () => {
        const edition = sampleEdition();

        expect(panelActions('space.05', edition)).toEqual([
            'swap',
            'clearNames',
        ]);
        expect(panelActions('space.12', edition)).toEqual([
            'swap',
            'clearNames',
        ]);
        expect(panelActions('space.00', edition)).toEqual([]);
        expect(panelActions('space.04', edition)).toEqual([]);
        expect(panelActions('deed.01', edition)).toEqual([]);
    });

    it('offers Foto wisselen met… on a street, station or utility with a photo (B238)', () => {
        const edition = {
            ...sampleEdition(),
            elements: {
                'space.05': {
                    photo: {
                        photoId: 'p1',
                        cx: 0.5,
                        cy: 0.5,
                        scale: 1,
                        rotation: 0,
                        grayscale: false,
                    },
                },
            },
        };

        expect(panelActions('space.05', edition)).toEqual([
            'reset',
            'swap',
            'swapPhoto',
            'clearNames',
        ]);
        expect(panelActions('space.06', edition)).not.toContain('swapPhoto');
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
        expect(panelActions('card.chance.17', edition)).toEqual([
            'removeCard',
            'clearDeck',
        ]);
        expect(panelActions('card.chance.18', edition)).toEqual([
            'reset',
            'removeCard',
            'clearDeck',
        ]);
        expect(panelActions('card.chance.03', edition)).toEqual(['clearDeck']);
    });

    it('offers "Kaarten leegmaken" on every card and the back of a deck while a card has text (B194)', () => {
        const edition = templateEdition('club', 'nl')!;

        expect(panelActions('card.chest.05', edition)).toContain('clearDeck');
        expect(panelActions('card_back.chest', edition)).toContain('clearDeck');
        expect(panelActions('card_back.deed', edition)).not.toContain(
            'clearDeck',
        );
        expect(panelActions('space.01', edition)).not.toContain('clearDeck');

        const cleared = {
            ...edition,
            elements: {
                ...edition.elements,
                ...Object.fromEntries(
                    Array.from({ length: 16 }, (_, index) => [
                        `card.chest.${String(index + 1).padStart(2, '0')}`,
                        { text: '' },
                    ]),
                ),
            },
        };
        expect(panelActions('card_back.chest', cleared)).not.toContain(
            'clearDeck',
        );
        expect(panelActions('card.chance.01', cleared)).toContain('clearDeck');
    });

    it('leaves the colours of the edition to their own panel', () => {
        const edition = {
            ...sampleEdition(),
            elements: { theme_accent: { color: '#123456' } },
        };
        expect(canReset('theme_accent', edition)).toBe(false);
    });

    it('measures a template edition against its template (B152)', () => {
        const edition = templateEdition('village', 'nl')!;
        const renamed = updateElement(edition, 'space.01', {
            name: 'Molenweg',
        }).edition;
        const cleared = setElement(
            edition,
            'card.chance.01',
            undefined,
        ).edition;

        expect(canReset('space.01', edition)).toBe(false);
        expect(panelActions('space.01', edition)).not.toContain('reset');
        expect(canReset('space.01', renamed)).toBe(true);
        // A card that lost its template text goes back to it.
        expect(canReset('card.chance.01', cleared)).toBe(true);
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
