import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BoardCenter } from '@/components/render/board';
import { BoardSpace } from '@/components/render/board-space';
import type { EditionTitle } from '@/components/render/edition-title';
import {
    clampTransform,
    setFit,
    startingPoint,
} from '@/lib/render/photos-transform';
import { spaceAt } from '@/lib/render/standard-edition';
import { defined } from '@/testing/defined';
import { coversTarget } from '@/testing/photo-transform';
import { photoLayout } from './photo';

const base = { theme: 'classic', locale: 'nl' } as const;

describe('photo that fits instead of fills (B168)', () => {
    const logo = { w: 4000, h: 1000 };
    const square = { w: 60, h: 60 };

    it('shows the whole photo at 100% and may go to 50%', () => {
        const fit = setFit(
            logo,
            { x: 0.5, y: 0.5, scale: 2, rotation: 0, grayscale: false },
            square,
            true,
        );

        expect(fit).toMatchObject({ fit: true, scale: 1, x: 0.5, y: 0.5 });
        expect(clampTransform(logo, { ...fit, scale: 0.2 }, square).scale).toBe(
            0.5,
        );
        // Filling never goes below 100%.
        expect(
            clampTransform(logo, { ...fit, fit: false, scale: 0.2 }, square)
                .scale,
        ).toBe(1);
    });

    it('draws a print crop that fits whole and centred in its slot', () => {
        const layout = photoLayout({ src: 'crop.jpg', fit: true }, 60, 40);

        expect(layout.objectFit).toBe('contain');
        expect(layout.box).toEqual({ left: 0, top: 0, width: 60, height: 40 });
    });

    it('prints a logo in the board centre whole, and lets it shrink below 100% in the editor', () => {
        const title = (source: Parameters<typeof EditionTitle>[0]['photo']) => {
            const image = render(
                <BoardCenter
                    theme="classic"
                    locale="nl"
                    editionName="Zaterdagclub"
                    title={{ mode: 'logo', photo: source }}
                />,
            ).container.querySelector('[data-slot="center-logo"] img');

            if (!(image instanceof HTMLImageElement)) {
                throw new Error('No logo drawn');
            }

            return image;
        };

        // In print the server sends the visible part; it sits whole in the frame, whatever the frame's shape.
        expect(title({ src: 'logo-crop.png', fit: true }).style.objectFit).toBe(
            'contain',
        );

        // In the editor a logo that fits may go to 50%: the image is then smaller than its frame.
        const img = title({
            src: 'logo.png',
            width: 600,
            height: 600,
            transform: {
                x: 0.5,
                y: 0.5,
                scale: 0.5,
                rotation: 0,
                grayscale: false,
                fit: true,
            },
        });
        const slot = defined(img.parentElement);
        expect(parseFloat(img.style.height)).toBeLessThan(
            parseFloat(slot.style.height),
        );
    });
});

describe('where a new photo starts (ronde 3, UX 1)', () => {
    it('puts a standing photo at the top third and keeps a lying one in the middle', () => {
        expect(startingPoint({ w: 3000, h: 4000 }).y).toBeCloseTo(1 / 3);
        expect(startingPoint({ w: 4000, h: 3000 }).y).toBe(0.5);
    });

    it('never shows an edge when a start or another frame puts the photo off its frame', () => {
        const source = { w: 3000, h: 4000 };
        const tall = { w: 30, h: 60 };
        // At the top third in a frame taller than the photo's shape: the window would run off the top.
        const layout = photoLayout(
            {
                src: 'p.jpg',
                width: source.w,
                height: source.h,
                transform: {
                    x: 0.5,
                    y: 0.1,
                    scale: 1,
                    rotation: 0,
                    grayscale: false,
                },
            },
            tall.w,
            tall.h,
        );

        expect(layout.box.top).toBeLessThanOrEqual(0);
        expect(layout.box.top + layout.box.height).toBeGreaterThanOrEqual(
            tall.h - 0.001,
        );
        expect(
            coversTarget(
                source,
                clampTransform(
                    source,
                    { x: 0.5, y: 0.1, scale: 1, rotation: 0, grayscale: false },
                    tall,
                ),
                tall,
            ),
        ).toBe(true);
    });
});

describe('a full photo on a space (ronde 3, UX 1)', () => {
    it('puts a dark plate behind the price, so it reads on any photo', () => {
        const { container } = render(
            <BoardSpace
                {...base}
                space={spaceAt(1)}
                photo={{ src: 'dark.jpg', style: 'full' }}
            />,
        );

        expect(
            container.querySelector('[data-slot="price-plate"]'),
        ).not.toBeNull();
    });
});
