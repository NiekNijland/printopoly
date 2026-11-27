import { render } from '@testing-library/react';

import { resolveEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { centerRect } from '@/lib/render/print-board';
import { INVITATION } from '@/lib/render/print-extras';
import { spaceAt } from '@/lib/render/standard-edition';
import { makeEdition, photo } from '@/testing/edition-test-utils';

import { BANKNOTE_SIZE_MM } from './banknote-parts';
import { spaceSize } from './board-space';
import { SPREAD_GAP } from './editor-deed-preview';
import {
    ElementPreview,
    editorSources,
    previewSize,
} from './editor-element-preview';
import { CARD_SIZE_MM } from './game-card';
import { PAWN_SIZE_MM } from './pawn';

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

const edition = makeEdition({ parts: ALL_PARTS });
const bare = makeEdition({ id: 'e2' });
const card = { w: CARD_SIZE_MM.width, h: CARD_SIZE_MM.height };
const spread = { w: 2 * CARD_SIZE_MM.width + SPREAD_GAP, h: card.h };
const photos: PhotoInfos = new Map([
    ['p1', { id: 'p1', url: 'blob:p1', width: 800, height: 600 }],
]);

const withStory = (key: string): Edition => ({
    ...edition,
    elements: { ...edition.elements, [key]: { text: 'A story' } },
});

const drawn = (key: string, from: Edition = edition): Element | null =>
    render(
        <ElementPreview
            target={{ key }}
            resolved={resolveEdition(from)}
            photos={new Map()}
        />,
    ).container.firstElementChild;

describe('previewSize', () => {
    const profile = edition.boardProfile;

    it('sizes a space like the board, and its deed like a card', () => {
        expect(previewSize({ key: 'space.01' }, edition)).toEqual(
            spaceSize(spaceAt(1), profile),
        );
        expect(previewSize({ key: 'space.00' }, edition)).toEqual({
            w: profile.corner,
            h: profile.corner,
        });
        expect(previewSize({ key: 'space.01', deed: true }, edition)).toEqual(
            card,
        );
    });

    it('widens a deed with a story to a spread of front and back', () => {
        expect(previewSize({ key: 'deed.01' }, edition)).toEqual(card);
        expect(previewSize({ key: 'deed.01' }, withStory('deed.01'))).toEqual(
            spread,
        );
        expect(previewSize({ key: 'deed.01' }, withStory('deed.02'))).toEqual(
            card,
        );
        expect(
            previewSize({ key: 'space.01', deed: true }, withStory('deed.01')),
        ).toEqual(spread);
    });

    it('takes the size of each other part from its renderer', () => {
        const centre = centerRect(profile);

        expect(previewSize({ key: 'card.chance.01' }, edition)).toEqual(card);
        expect(previewSize({ key: 'house_rules' }, edition)).toEqual(card);
        expect(previewSize({ key: 'note.10' }, edition)).toEqual(
            BANKNOTE_SIZE_MM,
        );
        expect(previewSize({ key: 'pawn.01' }, edition)).toEqual(PAWN_SIZE_MM);
        expect(previewSize({ key: 'box_lid' }, edition)).toEqual(
            profile.boxLid,
        );
        expect(previewSize({ key: 'invitation' }, edition)).toEqual(INVITATION);
        expect(previewSize({ key: 'board_center' }, edition)).toEqual({
            w: centre.w,
            h: centre.h,
        });
        expect(previewSize({ key: 'theme_accent' }, edition)).toEqual({
            w: profile.outer,
            h: profile.outer,
        });
    });

    it.each(['group.brown', 'rules_booklet', 'nonsense'])(
        'falls back to a 50 mm square for %s',
        (key) => {
            expect(previewSize({ key }, edition)).toEqual({ w: 50, h: 50 });
        },
    );
});

describe('ElementPreview', () => {
    it.each([
        ['space.01', 'space-street'],
        ['note.10', 'banknote'],
        ['pawn.01', 'pawn'],
        ['box_lid', 'box-lid'],
        ['house_rules', 'house-rules'],
        ['invitation', 'invitation'],
        ['board_center', 'board-center'],
        ['theme_accent', 'board'],
    ])('draws %s with the %s renderer', (key, element) => {
        expect(drawn(key)?.getAttribute('data-element')).toBe(element);
    });

    it('draws a deed and both sides of a card', () => {
        expect(drawn('deed.01')).not.toBeNull();
        expect(drawn('card.chance.01')).not.toBeNull();
        expect(drawn('card_back.chest')).not.toBeNull();
    });

    it.each(['group.brown', 'rules_booklet', 'words.bank', 'nonsense'])(
        'draws nothing for %s',
        (key) => {
            expect(drawn(key)).toBeNull();
        },
    );

    it.each(['note.10', 'pawn.01', 'box_lid', 'house_rules', 'invitation'])(
        'draws nothing for %s when its part is off',
        (key) => {
            expect(drawn(key, bare)).toBeNull();
        },
    );

    it('draws nothing for a note or pawn the edition does not have', () => {
        expect(drawn('note.7')).toBeNull();
        expect(drawn('pawn.99')).toBeNull();
    });

    it('passes the bleed to the sheet', () => {
        const { container } = render(
            <ElementPreview
                target={{ key: 'note.10' }}
                resolved={resolveEdition(edition)}
                photos={new Map()}
                bleedMm={3}
            />,
        );

        expect(container.firstElementChild?.getAttribute('data-bleed-mm')).toBe(
            '3',
        );
    });
});

describe('editorSources', () => {
    const sources = editorSources(photos);

    it('draws a photo of this browser and skips one it does not have', () => {
        expect(sources.photo('space.01', photo('p1'))?.src).toBe('blob:p1');
        expect(sources.photo('space.01', photo('gone'))).toBeUndefined();
    });

    it('turns an icon into a preset or a photo source', () => {
        expect(sources.icon('space.01', { preset: 'pointer' })).toEqual({
            preset: 'pointer',
        });
        expect(
            sources.icon('space.01', { photo: photo('p1'), aspect: 1 }),
        ).toMatchObject({ photo: { src: 'blob:p1' }, aspect: 1 });
    });

    it('turns photo layers into sources', () => {
        const [layer] = sources.layers('box_lid', [
            {
                id: 'l1',
                kind: 'photo',
                x: 0,
                y: 0,
                w: 10,
                h: 10,
                photo: photo('p1'),
            },
        ]);

        expect(layer).toMatchObject({
            kind: 'photo',
            photo: { src: 'blob:p1' },
        });
    });
});
