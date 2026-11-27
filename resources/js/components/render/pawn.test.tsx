import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PawnStyle } from '@/lib/render/edition-part-styles';
import { PLAYFAIR, SPARTAN, THEMES } from '@/lib/render/themes';
import { defined } from '@/testing/defined';
import { css, root } from '@/testing/render-dom';

import { PAWN_SIZE_MM, PawnSheetItem } from './pawn';
import { PANEL_HEIGHT } from './pawn-layout';

const pawn = (
    extra: { style?: PawnStyle; locale?: 'nl' | 'en'; theme?: 'riso' } = {},
) =>
    render(
        <PawnSheetItem
            theme={extra.theme ?? 'classic'}
            locale={extra.locale ?? 'nl'}
            name="Opa Henk"
            {...(extra.style === undefined
                ? {}
                : { style: { parts: { pawns: extra.style } } })}
        />,
    ).container;

const family = (value: string) => {
    const probe = document.createElement('div');

    probe.style.fontFamily = value;

    return probe.style.fontFamily;
};

const wordUnder = (word: string) =>
    defined(
        screen
            .getAllByText(word)
            .find((node) => node instanceof HTMLElement && node.style.color),
    );

describe('PawnSheetItem', () => {
    it('is a 40 by 55 mm pawn sheet on the paper of the theme', () => {
        const sheet = root(pawn({ theme: 'riso' }));

        expect(PAWN_SIZE_MM).toEqual({ w: 40, h: 55 });
        expect(sheet.dataset.element).toBe('pawn');
        expect(sheet.dataset.widthMm).toBe('40');
        expect(sheet.dataset.heightMm).toBe('55');
        expect(sheet.style.background).toBe(css(THEMES.riso.paper));
    });

    it('draws the face twice, the back turned upside down', () => {
        const container = pawn();
        const back = defined(
            container.querySelector<HTMLElement>('[data-slot="back"]'),
        );

        expect(back.style.transform).toBe('rotate(180deg)');
        expect(back.style.top).toBe(`${PANEL_HEIGHT}mm`);
        expect(back.textContent).toContain('Opa Henk');
        expect(
            container.textContent.split('Opa Henk').length,
        ).toBeGreaterThanOrEqual(3);
    });

    it('dashes the two fold lines between the panels in the line colour', () => {
        const lines = [...pawn().querySelectorAll('[data-fold-lines] line')];

        expect(lines.map((line) => line.getAttribute('y1'))).toEqual([
            String(PANEL_HEIGHT),
            String(2 * PANEL_HEIGHT),
        ]);
        expect(lines[0]?.getAttribute('stroke')).toBe(THEMES.classic.line);
        expect(lines[0]?.getAttribute('stroke-dasharray')).toBe('1.5 1');
    });

    it('writes the word on the foot in the language, in ink', () => {
        pawn({ locale: 'en' });

        expect(wordUnder('Pawn').style.color).toBe(css(THEMES.classic.ink));
    });

    it('sets the word on the foot in the font of the pawn style', () => {
        pawn({ style: 'vintage' });
        const vintage = wordUnder('Pion').style;

        expect(vintage.fontFamily).toBe(family(PLAYFAIR));
        expect(vintage.textTransform).toBe('uppercase');
        expect(vintage.letterSpacing).toBe('0.16em');
    });

    it('sets the word in spaced Spartan for Modern', () => {
        pawn({ style: 'modern' });

        expect(wordUnder('Pion').style.fontFamily).toBe(family(SPARTAN));
        expect(wordUnder('Pion').style.letterSpacing).toBe('0.05em');
    });

    it('leaves the word as typed without a pawn style', () => {
        pawn();

        expect(wordUnder('Pion').style.textTransform).toBe('');
        expect(wordUnder('Pion').style.letterSpacing).toBe('');
        expect(wordUnder('Pion').style.fontFamily).not.toBe(family(PLAYFAIR));
    });
});
