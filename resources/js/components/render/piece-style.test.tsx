import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { BoxLidStyle, PawnStyle } from '@/lib/edition/part-styles';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import type { PhotoSource } from '@/lib/render/photo';
import { THEME_IDS } from '@/lib/render/themes';

import { BoxLid } from './box-lid';
import { PawnSheetItem } from './pawn';
import { scallopedRect, scatter, seedOf, wavePath } from './piece-styles';

const STYLES: readonly ('vintage' | 'modern' | 'playful' | undefined)[] = [
    undefined,
    'vintage',
    'modern',
    'playful',
];

const photo: PhotoSource = {
    src: 'data:image/png;base64,AAAA',
    width: 800,
    height: 600,
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0, grayscale: false },
};

function pawn(
    style: PawnStyle | undefined,
    extra: { photo?: PhotoSource; theme?: (typeof THEME_IDS)[number] } = {},
) {
    return render(
        <PawnSheetItem
            theme={extra.theme ?? 'classic'}
            locale="nl"
            name="Opa Henk"
            {...(extra.photo === undefined ? {} : { photo: extra.photo })}
            {...(style === undefined
                ? {}
                : { style: { parts: { pawns: style } } })}
        />,
    ).container;
}

function lid(
    style: BoxLidStyle | undefined,
    extra: {
        photo?: PhotoSource;
        theme?: (typeof THEME_IDS)[number];
        size?: { w: number; h: number };
    } = {},
) {
    return render(
        <BoxLid
            theme={extra.theme ?? 'classic'}
            locale="nl"
            editionName="Zaterdagclub"
            lines="Kerst 2026"
            bleedMm={3}
            {...(extra.photo === undefined ? {} : { photo: extra.photo })}
            {...(extra.size === undefined
                ? {}
                : {
                      profile: {
                          ...DEFAULT_BOARD_PROFILE,
                          boxLid: extra.size,
                      },
                  })}
            {...(style === undefined
                ? {}
                : { style: { parts: { boxLid: style } } })}
        />,
    ).container;
}

const box = (element: Element | null) => [
    element?.getAttribute('data-w'),
    element?.getAttribute('data-h'),
];

describe('pawn styles (B271)', () => {
    it.each(
        THEME_IDS.flatMap((theme) => STYLES.map((s) => [theme, s] as const)),
    )(
        'draws a %s pawn in style %s with its name twice, the initial and both fold lines',
        (theme, style) => {
            const container = pawn(style, { theme });
            expect(
                container.querySelectorAll('[data-slot="name"]'),
            ).toHaveLength(2);
            expect(
                container.querySelectorAll('[data-slot="initial"]'),
            ).toHaveLength(2);
            expect(
                container.querySelectorAll('[data-fold-lines] line'),
            ).toHaveLength(2);
        },
    );

    it('draws the theme exactly as before without a style', () => {
        const plain = pawn(undefined);
        expect(plain.querySelector('[data-slot="vintage-rules"]')).toBeNull();
        expect(plain.querySelector('[data-slot="tile"]')).toBeNull();
        expect(plain.querySelector('[data-slot="name-bar"]')).toBeNull();
        expect(plain.querySelector('[data-slot="confetti"]')).toBeNull();
    });

    it('gives each style its own marks', () => {
        const vintage = pawn('vintage');
        expect(
            vintage.querySelector('[data-slot="vintage-rules"]'),
        ).not.toBeNull();
        expect(vintage.querySelector('[data-slot="flourish"]')).not.toBeNull();
        expect(
            vintage.querySelectorAll('[data-slot="initial"] circle').length,
        ).toBeGreaterThan(50);
        expect(
            pawn('modern').querySelector('[data-slot="name-bar"]'),
        ).not.toBeNull();
        const playful = pawn('playful');
        expect(playful.querySelector('[data-slot="tile"]')).not.toBeNull();
        expect(playful.querySelector('[data-slot="confetti"]')).not.toBeNull();
    });

    it('draws the guilloche as lines, never as an SVG pattern, which Chrome prints as a blurry picture', () => {
        expect(pawn('vintage').querySelector('pattern')).toBeNull();
        const vintage = lid('vintage');
        expect(vintage.querySelector('pattern')).toBeNull();
        expect(
            vintage.querySelectorAll('[data-slot="lid-border"] svg path')
                .length,
        ).toBe(16);
    });

    it.each(STYLES)(
        'crops the photo to the same frame in style %s, framed and over the whole panel',
        (style) => {
            const framed = pawn(style, { photo });
            expect(
                framed.querySelectorAll('[data-photo="filled"]'),
            ).toHaveLength(2);
            expect(box(framed.querySelector('[data-photo="filled"]'))).toEqual([
                '17',
                '19.5',
            ]);
            const full = pawn(style, { photo: { ...photo, style: 'full' } });
            expect(box(full.querySelector('[data-photo="filled"]'))).toEqual([
                '40',
                '22.5',
            ]);
            expect(
                full.querySelectorAll('[data-slot="name-band"]'),
            ).toHaveLength(2);
        },
    );
});

describe('box lid styles (B271)', () => {
    it.each(
        THEME_IDS.flatMap((theme) => STYLES.map((s) => [theme, s] as const)),
    )(
        'draws a %s lid in style %s with the name plate, the board, the text and the street colours',
        (theme, style) => {
            const container = lid(style, { theme });
            expect(
                container.querySelector('[data-slot="lid-plate"]'),
            ).not.toBeNull();
            expect(
                container.querySelector('[data-slot="lid-board"]'),
            ).not.toBeNull();
            expect(
                container.querySelector('[data-slot="subtitle"]'),
            ).not.toBeNull();
            expect(
                container.querySelector('[data-slot="lines"]'),
            ).not.toBeNull();
            expect(
                container.querySelector('[data-slot="lid-strip"]'),
            ).not.toBeNull();
        },
    );

    it('keeps the frame of the theme without a style, and draws each style its own', () => {
        expect(
            [...lid(undefined).querySelectorAll('[data-frame]')].filter(
                (frame) => frame.closest('[data-slot="lid-board"]') === null,
            ),
        ).toHaveLength(1);
        const vintage = lid('vintage');
        expect(
            vintage.querySelector('[data-slot="lid-border"]'),
        ).not.toBeNull();
        expect(
            vintage.querySelectorAll('[data-slot="lid-corner"]'),
        ).toHaveLength(4);
        expect(vintage.querySelector('[data-slot="lid-paper"]')).not.toBeNull();
        const modern = lid('modern');
        expect(modern.querySelector('[data-slot="lid-discs"]')).not.toBeNull();
        expect(
            modern.querySelector('[data-slot="offset-block"]'),
        ).not.toBeNull();
        // The frames inside the board picture belong to the board; the lid itself has none.
        expect(
            [...modern.querySelectorAll('[data-frame]')].filter(
                (frame) => frame.closest('[data-slot="lid-board"]') === null,
            ),
        ).toHaveLength(0);
        const playful = lid('playful');
        expect(playful.querySelector('[data-slot="lid-doily"]')).not.toBeNull();
        expect(playful.querySelector('[data-slot="confetti"]')).not.toBeNull();
        expect(playful.querySelectorAll('[data-slot="tape"]')).toHaveLength(2);
    });

    it.each(STYLES)(
        'crops the photo of the lid to the same frame in style %s',
        (style) => {
            const reference = box(
                lid(undefined, { photo }).querySelector(
                    '[data-photo="filled"]',
                ),
            );
            const framed = lid(style, { photo });
            expect(box(framed.querySelector('[data-photo="filled"]'))).toEqual(
                reference,
            );
            const full = lid(style, { photo: { ...photo, style: 'full' } });
            expect(box(full.querySelector('[data-photo="filled"]'))).toEqual([
                '273',
                '273',
            ]);
            expect(
                full.querySelector('[data-slot="name-band"]'),
            ).not.toBeNull();
        },
    );

    it.each(STYLES)('fits a rectangular lid in style %s', (style) => {
        const container = lid(style, { size: { w: 320, h: 200 } });
        expect(
            container.querySelector('[data-slot="lid-board"]'),
        ).not.toBeNull();
        expect(
            container.querySelector('[data-element="box-lid"]'),
        ).not.toBeNull();
    });
});

describe('piece style helpers', () => {
    it('makes the same scallops and confetti every time', () => {
        expect(scallopedRect(5, 5, 100, 60, 7)).toBe(
            scallopedRect(5, 5, 100, 60, 7),
        );
        const a = scatter(3, { x: 0, y: 0, w: 40, h: 120 }, 12, 4, ['#000000']);
        expect(a).toEqual(
            scatter(3, { x: 0, y: 0, w: 40, h: 120 }, 12, 4, ['#000000']),
        );
        expect(a).toHaveLength(12);
        for (const piece of a) {
            expect(piece.x).toBeGreaterThanOrEqual(0);
            expect(piece.x).toBeLessThanOrEqual(40);
        }
        expect(seedOf('Sophie')).toBe(seedOf('Sophie'));
        // A wave covers its whole band, so the rope has no gap at either end.
        const wave = wavePath(0, 100, 2, 1.5, 4, 1 / 3);
        const xs = [...wave.matchAll(/[MQT](-?[\d.]+) /g)].map((m) =>
            Number(m[1]),
        );
        expect(Math.min(...xs)).toBeLessThanOrEqual(0);
        expect(Math.max(...xs)).toBeGreaterThanOrEqual(100);
    });
});
