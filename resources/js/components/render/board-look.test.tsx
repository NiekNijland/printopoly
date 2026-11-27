import { render } from '@testing-library/react';

import { mix } from '@/lib/render/color';
import type { BoardStyle } from '@/lib/render/edition-part-styles';
import { PLAYFAIR, SPARTAN, THEMES } from '@/lib/render/themes';

import {
    CREAM,
    QuarterDisc,
    boardLookOf,
    ruleColor,
    spacePaper,
    useBoardLook,
} from './board-look';
import { Sheet } from './sheet';

const classic = THEMES.classic;

const LookProbe = () => {
    const look = useBoardLook();

    return (
        <span
            data-style={look.style ?? 'theme'}
            data-family={look.name.family ?? 'none'}
        />
    );
};

const probe = (style: BoardStyle | undefined) => {
    const { container } = render(
        <Sheet
            element="probe"
            theme="classic"
            locale="nl"
            widthMm={10}
            heightMm={10}
            background="#fff"
            {...(style === undefined
                ? {}
                : { style: { parts: { board: style } } })}
        >
            <LookProbe />
        </Sheet>,
    );

    return container.querySelector('[data-style]');
};

describe('boardLookOf', () => {
    it('sets names in spaced Playfair capitals for Vintage', () => {
        const look = boardLookOf(classic, 'vintage');

        expect(look.style).toBe('vintage');
        expect(look.name).toEqual({
            font: 'heading',
            family: PLAYFAIR,
            weight: 700,
            caps: true,
            letterSpacingEm: 0.04,
        });
        expect(look.figure.family).toBe(PLAYFAIR);
        expect(look.figure.caps).toBe(false);
    });

    it('sets names in tight Spartan capitals for Modern', () => {
        const look = boardLookOf(classic, 'modern');

        expect(look.name.family).toBe(SPARTAN);
        expect(look.name.weight).toBe(800);
        expect(look.name.caps).toBe(true);
        expect(look.name.letterSpacingEm).toBe(-0.01);
        expect(look.figure.family).toBe(SPARTAN);
    });

    it('keeps names as typed for Speels', () => {
        const look = boardLookOf(classic, 'playful');

        expect(look.name.caps).toBe(false);
        expect(look.name.family).toBe(SPARTAN);
        expect(look.name.letterSpacingEm).toBeUndefined();
    });

    it('follows the theme without a style: capitals except on Strak', () => {
        const own = boardLookOf(classic, undefined);

        expect(own.style).toBeUndefined();
        expect(own.name).toEqual({ font: 'heading', caps: true });
        expect(own.figure).toEqual({ font: 'body', weight: 600, caps: false });
        expect(boardLookOf(THEMES.strak, undefined).name.caps).toBe(false);
    });
});

describe('useBoardLook', () => {
    it('reads the board style of the edition from the render context', () => {
        const modern = probe('modern');

        expect(modern?.getAttribute('data-style')).toBe('modern');
        expect(modern?.getAttribute('data-family')).toBe(SPARTAN);
        expect(probe(undefined)?.getAttribute('data-style')).toBe('theme');
    });
});

describe('spacePaper', () => {
    it('warms the paper to cream in Vintage', () => {
        expect(spacePaper(classic, 'vintage', '#FFFFFF')).toBe(
            mix('#FFFFFF', CREAM, 0.75),
        );
        expect(spacePaper(classic, 'vintage', '#FFFFFF')).not.toBe('#FFFFFF');
    });

    it('turns the board colour into clean paper in Modern and keeps other colours', () => {
        expect(spacePaper(classic, 'modern', classic.boardBackground)).toBe(
            classic.paper,
        );
        expect(spacePaper(classic, 'modern', '#123456')).toBe('#123456');
    });

    it('keeps the colour as it is in Speels and in the theme look', () => {
        expect(spacePaper(classic, 'playful', classic.boardBackground)).toBe(
            classic.boardBackground,
        );
        expect(spacePaper(classic, undefined, '#123456')).toBe('#123456');
    });
});

describe('ruleColor', () => {
    it('softens the accent of the theme a quarter towards its ink', () => {
        const riso = THEMES.riso;

        expect(ruleColor(riso)).toBe(mix(riso.accent, riso.ink, 0.25));
        expect(ruleColor(riso)).not.toBe(riso.accent);
        expect(ruleColor(riso)).not.toBe(riso.ink);
    });
});

describe('QuarterDisc', () => {
    it('draws a clipped disc centred on the outer corner', () => {
        const { container } = render(
            <QuarterDisc size={70} radius={40} color="#C8321F" />,
        );
        const circle = container.querySelector('[data-slot="quarter"] circle');

        expect(circle?.getAttribute('cx')).toBe('70');
        expect(circle?.getAttribute('cy')).toBe('70');
        expect(circle?.getAttribute('r')).toBe('40');
        expect(circle?.getAttribute('fill')).toBe('#C8321F');
        expect(
            container.querySelector<SVGElement>('[data-slot="quarter"]')?.style
                .overflow,
        ).toBe('hidden');
    });
});
