import { describe, expect, it } from 'vitest';

import { parseIcon, parseLayer, parsePhoto } from './edition-schema-values';

const placement = {
    photoId: 'p1',
    cx: 0.5,
    cy: 0.5,
    scale: 1,
    rotation: 0,
    grayscale: false,
};

describe('parsePhoto', () => {
    it('keeps a valid placement and a fit only when it is on', () => {
        expect(parsePhoto({ ...placement, fit: false }, 'x', [])).toEqual(
            placement,
        );
        expect(parsePhoto({ ...placement, fit: true }, 'x', [])).toEqual({
            ...placement,
            fit: true,
        });
    });

    it('reports every problem of a placement in order', () => {
        const errors: string[] = [];

        expect(
            parsePhoto(
                { photoId: '', cx: 2, cy: 0, scale: 0, rotation: 'a' },
                'space.01.photo',
                errors,
            ),
        ).toBeUndefined();
        expect(errors).toEqual([
            'space.01.photo: photoId must be a non-empty string',
            'space.01.photo: cx and cy must be between 0 and 1',
            'space.01.photo: scale must be greater than 0',
            'space.01.photo: rotation must be a number',
            'space.01.photo: grayscale must be a boolean',
        ]);
    });
});

describe('parseLayer', () => {
    const box = { id: 'l1', x: 1, y: 2, w: 3, h: 4 };

    it('reads a text layer with its colour, letter and alignment', () => {
        expect(
            parseLayer(
                {
                    ...box,
                    kind: 'text',
                    text: 'Hoi',
                    color: '#A1B2C3',
                    font: 'mono',
                    align: 'left',
                },
                'x',
                [],
            ),
        ).toEqual({
            ...box,
            kind: 'text',
            text: 'Hoi',
            color: '#A1B2C3',
            font: 'mono',
            align: 'left',
        });
    });

    it('rejects a text layer with an unknown letter', () => {
        const errors: string[] = [];

        expect(
            parseLayer(
                { ...box, kind: 'text', text: 'Hoi', font: 'serif' },
                'box_lid.layers[0]',
                errors,
            ),
        ).toBeUndefined();
        expect(errors).toHaveLength(1);
    });

    it('reads a photo layer and rejects an unknown kind', () => {
        expect(
            parseLayer({ ...box, kind: 'photo', photo: placement }, 'x', []),
        ).toEqual({ ...box, kind: 'photo', photo: placement });
        expect(parseLayer({ ...box, kind: 'shape' }, 'x', [])).toBeUndefined();
    });
});

describe('parseIcon', () => {
    it('takes a built-in icon or an uploaded image with its aspect', () => {
        expect(parseIcon({ preset: 'train' }, 'x', [])).toEqual({
            preset: 'train',
        });
        expect(parseIcon({ photo: placement, aspect: 2 }, 'x', [])).toEqual({
            photo: placement,
            aspect: 2,
        });
        expect(parseIcon({ photo: placement, aspect: 40 }, 'x', [])).toBe(
            undefined,
        );
    });
});
