import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mix } from '@/lib/render/color';
import type { DeedStyle } from '@/lib/render/edition-part-styles';
import { PLAYFAIR, SPARTAN, THEMES } from '@/lib/render/themes';
import { defined } from '@/testing/defined';
import { css } from '@/testing/render-dom';

import { creamed, engraving } from './card-look';
import {
    StyledDeedFrame,
    StyledDeedRule,
    StyledMortgageBox,
    deedLookOf,
    styledDeedPaper,
    styledRowStyle,
} from './title-deed-styles';

const theme = THEMES.classic;
const BAND = '#C8321F';
const STYLES: readonly DeedStyle[] = ['vintage', 'modern', 'playful'];

const slotOf = (container: HTMLElement, slot: string) =>
    container.querySelector<HTMLElement>(`[data-slot="${slot}"]`);

describe('styledDeedPaper', () => {
    it('creams the deed paper for Vintage and keeps it for Modern', () => {
        expect(styledDeedPaper(theme, 'vintage', BAND, true)).toBe(
            creamed(theme.deedPaper, 0.5),
        );
        expect(styledDeedPaper(theme, 'modern', BAND, true)).toBe(
            theme.deedPaper,
        );
    });

    it('tints Speels in the group colour for a street, the board colour otherwise', () => {
        expect(styledDeedPaper(theme, 'playful', BAND, true)).toBe(
            mix(BAND, theme.deedPaper, 0.72),
        );
        expect(styledDeedPaper(theme, 'playful', BAND, false)).toBe(
            theme.boardBackground,
        );
    });
});

describe('StyledDeedFrame', () => {
    const frame = (style: DeedStyle) =>
        render(<StyledDeedFrame style={style} w={63} h={88} seed={4} />)
            .container;

    it('engraves a border for Vintage, a wobbly tile for Speels and nothing for Modern', () => {
        expect(slotOf(frame('vintage'), 'engraved-border')).not.toBeNull();
        expect(slotOf(frame('playful'), 'tile')).not.toBeNull();
        expect(frame('modern').innerHTML).toBe('');
    });
});

describe('deedLookOf', () => {
    it('sets Vintage in spaced Playfair capitals', () => {
        const look = deedLookOf('vintage');

        expect(look.label).toEqual({
            family: PLAYFAIR,
            weight: 700,
            caps: true,
            letterSpacingEm: 0.22,
        });
        expect(look.name.letterSpacingEm).toBe(0.05);
        expect(look.amount).toEqual({ fontWeight: 600 });
    });

    it('sets Modern in Spartan capitals and Speels in Spartan as typed', () => {
        expect(deedLookOf('modern').name).toEqual({
            family: SPARTAN,
            weight: 800,
            caps: true,
            letterSpacingEm: -0.01,
        });
        expect(deedLookOf('playful').name).toEqual({
            family: SPARTAN,
            weight: 800,
            caps: false,
        });
        expect(deedLookOf('playful').amount.fontFamily).toBe(SPARTAN);
    });
});

describe('StyledDeedRule', () => {
    const rule = (style: DeedStyle, street = true) =>
        defined(
            slotOf(
                render(
                    <StyledDeedRule
                        style={style}
                        x={4}
                        y={50}
                        w={55}
                        band={BAND}
                        street={street}
                    />,
                ).container,
                'rule',
            ),
        );

    it('draws a double rule with a diamond in the engraving ink for Vintage', () => {
        const paths = [...rule('vintage').querySelectorAll('path')];

        expect(paths).toHaveLength(3);
        expect(paths[0]?.getAttribute('stroke')).toBe(
            engraving(theme, theme.deedFrame),
        );
        expect(paths[2]?.getAttribute('fill')).toBe(
            engraving(theme, theme.deedFrame),
        );
    });

    it('draws a bar for Modern in the group colour, or in ink when not a street', () => {
        expect(rule('modern', true).style.background).toBe(css(BAND));
        expect(rule('modern', false).style.background).toBe(css(theme.ink));
    });

    it('draws a wavy ink line for Speels', () => {
        expect(
            rule('playful').querySelector('path')?.getAttribute('stroke'),
        ).toBe(theme.ink);
    });
});

describe('styledRowStyle', () => {
    it('gives Vintage a fine leader and no row stripe', () => {
        const { row, leader } = styledRowStyle('vintage', 0, BAND, true, theme);

        expect(row).toEqual({});
        expect(leader?.flex).toBe(1);
        expect(leader?.borderBottom).toContain('0.12mm solid');
    });

    it('stripes every other Modern row in a tint and draws no leader', () => {
        const even = styledRowStyle('modern', 0, BAND, true, theme);
        const odd = styledRowStyle('modern', 1, BAND, true, theme);

        expect(even.leader).toBeNull();
        expect(even.row.background).toBe(mix(BAND, theme.deedPaper, 0.84));
        expect(odd.row.background).toBeUndefined();
        expect(
            styledRowStyle('modern', 0, BAND, false, theme).row.background,
        ).toBe(mix(theme.ink, theme.deedPaper, 0.93));
    });

    it('gives Speels a heavier leader in a soft ink', () => {
        const { leader } = styledRowStyle('playful', 0, BAND, true, theme);

        expect(leader?.borderBottom).toBe(
            `0.25mm solid ${mix(theme.ink, theme.deedPaper, 0.7)}`,
        );
    });
});

describe('StyledMortgageBox', () => {
    const box = (style: DeedStyle, street = true) =>
        defined(
            slotOf(
                render(
                    <StyledMortgageBox
                        style={style}
                        x={10}
                        y={30}
                        w={43}
                        h={30}
                        band={BAND}
                        street={street}
                        seed={2}
                    />,
                ).container,
                'mortgage-box',
            ),
        );

    it.each(STYLES)('draws the mortgage box in %s', (style) => {
        expect(box(style)).toBeInstanceOf(Element);
    });

    it('widens the tinted Modern box by 3 mm on each side', () => {
        const modern = box('modern', false);

        expect(modern.style.left).toBe('7mm');
        expect(modern.style.width).toBe('49mm');
        expect(modern.style.background).toBe(
            css(mix(theme.ink, theme.deedPaper, 0.93)),
        );
    });

    it('fills the Speels tile with the group tint, or the accent tint when not a street', () => {
        const fills = (street: boolean) =>
            [...box('playful', street).querySelectorAll('path')].map((path) =>
                path.getAttribute('fill'),
            );

        expect(fills(true)).toContain(mix(BAND, theme.deedPaper, 0.8));
        expect(fills(false)).toContain(
            mix(theme.accent, theme.deedPaper, 0.88),
        );
    });

    it('engraves an oval with a rosette for Vintage', () => {
        const strokes = [...box('vintage').querySelectorAll('[stroke]')].map(
            (node) => node.getAttribute('stroke'),
        );

        expect(strokes).toContain(engraving(theme, theme.deedFrame));
    });
});
