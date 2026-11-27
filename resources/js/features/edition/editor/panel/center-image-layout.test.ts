import { photo } from '@/testing/edition-test-utils';

import { centerLayoutOf, switchCenterLayout } from './center-image-layout';

const square = { w: 100, h: 100 };

describe('centerLayoutOf', () => {
    it('reads the layout a centre shows', () => {
        expect(centerLayoutOf(undefined)).toBe('name');
        expect(centerLayoutOf({ centerMode: 'photo' })).toBe('photo');
        expect(centerLayoutOf({ centerMode: 'logo' })).toBe('logo');
        expect(
            centerLayoutOf({ centerMode: 'photo', background: photo('b') }),
        ).toBe('full');
        expect(
            centerLayoutOf({ centerMode: 'logo', background: photo('b') }),
        ).toBe('logo');
    });
});

describe('switchCenterLayout', () => {
    const aspect = (ratio: number | undefined) => () => ratio;

    it('keeps the photo waiting when the centre goes back to its name', () => {
        expect(
            switchCenterLayout(
                { background: photo('b') },
                'name',
                aspect(1),
                square,
            ),
        ).toEqual({
            centerMode: undefined,
            background: undefined,
            photo: photo('b'),
        });
        expect(switchCenterLayout(undefined, 'name', aspect(1))).toEqual({
            centerMode: undefined,
            background: undefined,
        });
    });

    it('asks for a photo first when the centre has none', () => {
        expect(switchCenterLayout(undefined, 'photo', aspect(1))).toBeNull();
        expect(switchCenterLayout({}, 'full', aspect(1))).toBeNull();
    });

    it('takes the photo along above the name, with its aspect, and fits a logo whole', () => {
        expect(
            switchCenterLayout({ photo: photo('p') }, 'photo', aspect(1.5)),
        ).toEqual({
            centerMode: 'photo',
            background: undefined,
            photo: photo('p'),
            photoAspect: 1.5,
        });
        expect(
            switchCenterLayout(
                { photo: photo('p') },
                'logo',
                aspect(undefined),
            ),
        ).toEqual({
            centerMode: 'logo',
            background: undefined,
            photo: { ...photo('p'), fit: true },
        });
    });

    it('starts a photo over the whole centre anew, off the fold', () => {
        const patch = switchCenterLayout(
            { photo: { ...photo('p'), fit: true } },
            'full',
            aspect(2),
            square,
        );

        expect(patch).toMatchObject({
            centerMode: undefined,
            photo: undefined,
            background: { photoId: 'p', scale: 1 },
        });
        expect(patch?.background).not.toHaveProperty('fit');
        expect(patch?.background?.cx).not.toBe(0.5);
    });

    it('keeps a photo over the whole centre where it was, and one without a known size as it is', () => {
        const placed = { ...photo('b'), cx: 0.2 };

        expect(
            switchCenterLayout(
                { background: placed },
                'full',
                aspect(2),
                square,
            )?.background,
        ).toEqual(placed);
        expect(
            switchCenterLayout({ photo: placed }, 'full', aspect(undefined))
                ?.background,
        ).toEqual(placed);
    });
});
