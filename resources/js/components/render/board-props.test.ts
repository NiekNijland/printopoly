import { describe, expect, it, vi } from 'vitest';

import { resolveEdition } from '@/lib/render/edition-resolve';
import type { ElementOverride, FreeLayer } from '@/lib/render/edition-types';
import { makeEdition, photo } from '@/testing/edition-test-utils';

import {
    NO_PHOTOS,
    boardPropsOf,
    editionLook,
    type BoardSources,
} from './board-props';

const resolvedWith = (
    elements: Record<string, ElementOverride> = {},
    language: 'nl' | 'en' = 'nl',
) => resolveEdition({ ...makeEdition({ language }), elements });

const textLayer: FreeLayer = {
    id: 't1',
    kind: 'text',
    text: 'Hallo',
    x: 1,
    y: 2,
    w: 30,
    h: 10,
};
const photoLayer: FreeLayer = {
    id: 'p1',
    kind: 'photo',
    photo: photo('p1'),
    x: 0,
    y: 0,
    w: 20,
    h: 20,
};

describe('NO_PHOTOS', () => {
    it('draws no photos', () => {
        expect(NO_PHOTOS.photo('space.01', photo('p1'))).toBeUndefined();
    });

    it('keeps a preset icon and drops an uploaded one', () => {
        expect(NO_PHOTOS.icon('space.04', { preset: 'coins' })).toEqual({
            preset: 'coins',
        });
        expect(
            NO_PHOTOS.icon('space.04', { photo: photo('p1'), aspect: 1 }),
        ).toBeUndefined();
        expect(NO_PHOTOS.icon('space.04', undefined)).toBeUndefined();
    });

    it('keeps the text layers only', () => {
        expect(
            NO_PHOTOS.layers('board_center', [textLayer, photoLayer]),
        ).toEqual([textLayer]);
    });
});

describe('editionLook', () => {
    it('gives the theme, language, currency and words of the edition', () => {
        const look = editionLook(resolvedWith({}, 'en'));

        expect(look.theme).toBe('classic');
        expect(look.locale).toBe('en');
        expect(look.currency).toBe('gbp');
        expect(look.words.house).toEqual({
            singular: 'house',
            plural: 'houses',
        });
        expect(look).not.toHaveProperty('style');
    });

    it('adds the style when the edition changes colours', () => {
        expect(
            editionLook(resolvedWith({ 'group.pink': { color: '#AA0000' } }))
                .style,
        ).toEqual({ groupColors: { pink: '#AA0000' } });
    });
});

describe('boardPropsOf', () => {
    it('draws the standard board by name without sources', () => {
        const props = boardPropsOf(resolvedWith());

        expect(props.editionName).toBe('Zaterdagclub');
        expect(Object.keys(props.spaces ?? {})).toHaveLength(40);
        expect(props.spaces?.[1]).toMatchObject({ name: 'Molenweg' });
        expect(props.spaces?.[1]).not.toHaveProperty('photo');
        expect(props.spaces?.[1]?.space?.type).toBe('street');
        expect(props.centerLayers).toEqual([]);
        expect(props.centerTitle?.photo).toBeUndefined();
    });

    it('fills in the names, towns, texts, photos and icons of the spaces', () => {
        const sources: BoardSources = {
            photo: (key, placement, _style, field) =>
                placement === undefined
                    ? undefined
                    : {
                          src: `${key}-${field ?? 'photo'}-${placement.photoId}`,
                      },
            icon: (key) => ({ preset: key === 'space.04' ? 'coins' : 'dice' }),
            layers: (_key, layers) =>
                layers.flatMap((layer) =>
                    layer.kind === 'text' ? [{ ...layer, text: layer.id }] : [],
                ),
        };
        const props = boardPropsOf(
            resolvedWith({
                'space.01': { name: 'Thuis', photo: photo('home') },
                'group.brown': { town: 'Ons dorp' },
                'space.00': { text: 'Hup' },
                board_center: {
                    name: 'Club',
                    photo: photo('logo'),
                    background: photo('bg'),
                    layers: [textLayer],
                },
            }),
            sources,
        );

        expect(props.editionName).toBe('Club');
        expect(props.spaces?.[1]).toMatchObject({
            name: 'Thuis',
            town: 'Ons dorp',
            photo: { src: 'space.01-photo-home' },
        });
        expect(props.spaces?.[0]?.text).toBe('Hup');
        expect(props.spaces?.[4]?.icon).toEqual({ preset: 'coins' });
        expect(props.centerTitle?.photo).toEqual({
            src: 'board_center-photo-logo',
        });
        expect(props.centerTitle?.background).toEqual({
            src: 'board_center-background-bg',
        });
        expect(props.centerLayers).toEqual([{ ...textLayer, text: 't1' }]);
    });

    it('asks the sources for every space and the centre', () => {
        const photoSource = vi.fn<BoardSources['photo']>();
        boardPropsOf(resolvedWith(), { ...NO_PHOTOS, photo: photoSource });

        expect(photoSource).toHaveBeenCalledTimes(42);
        expect(photoSource).toHaveBeenCalledWith(
            'board_center',
            undefined,
            undefined,
            'background',
        );
    });
});
