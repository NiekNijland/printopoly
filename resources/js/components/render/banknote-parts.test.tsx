import { render, renderHook } from '@testing-library/react';
import { useContext, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { RenderWords } from '@/lib/render/words';
import type { Locale } from '@/types/game';

import {
    BANKNOTE_SIZE_MM,
    NoteIcon,
    NoteRaster,
    NoteSvg,
    RasterNotePattern,
    tint,
    useNoteWords,
} from './banknote-parts';
import { Sheet } from './sheet';

const sheet = (locale: Locale, words?: RenderWords) => {
    const NoteSheet = ({ children }: { children: ReactNode }) => (
        <Sheet
            element="banknote"
            theme="classic"
            locale={locale}
            words={words}
            widthMm={BANKNOTE_SIZE_MM.w}
            heightMm={BANKNOTE_SIZE_MM.h}
            background="#FFFFFF"
        >
            {children}
        </Sheet>
    );

    return NoteSheet;
};

describe('NoteSvg', () => {
    it('lays one SVG in mm over the whole note', () => {
        const { container } = render(
            <NoteSvg slot="lines">
                <path d="M0 0" />
            </NoteSvg>,
        );
        const svg = container.querySelector<SVGSVGElement>(
            '[data-slot="lines"]',
        );

        expect(svg?.getAttribute('viewBox')).toBe('0 0 130 60');
        expect(svg?.style.width).toBe('130mm');
        expect(svg?.style.left).toBe('0px');
        expect(svg?.querySelector('path')).not.toBeNull();
    });

    it('prints the second drum slightly off register', () => {
        const { container } = render(
            <NoteSvg slot="riso" offset>
                <g />
            </NoteSvg>,
        );
        const svg =
            container.querySelector<SVGSVGElement>('[data-slot="riso"]');

        expect(svg?.style.left).toBe('0.35mm');
        expect(svg?.style.top).toBe('0.25mm');
    });
});

describe('NoteRaster', () => {
    it('shows the line work as one picture over the note', () => {
        const { container } = render(
            <NoteRaster src="data:image/png;base64,AA" slot="lines" offset />,
        );
        const image =
            container.querySelector<HTMLImageElement>('[data-raster]');

        expect(image?.getAttribute('src')).toBe('data:image/png;base64,AA');
        expect(image?.dataset.slot).toBe('lines');
        expect(image?.style.height).toBe('60mm');
        expect(image?.style.left).toBe('0.35mm');
    });

    it('lies flat without offset', () => {
        const { container } = render(<NoteRaster src="a.png" slot="lines" />);

        expect(
            container.querySelector<HTMLImageElement>('[data-raster]')?.style
                .top,
        ).toBe('0px');
    });
});

describe('NoteIcon', () => {
    const icon = (name: 'house' | 'hotel' | 'key' | 'die') =>
        render(
            <svg>
                <NoteIcon
                    name={name}
                    box={{ x: 10, y: 0, w: 23, h: 30 }}
                    ink="#111111"
                    light="#EEEEEE"
                />
            </svg>,
        ).container.querySelector(`[data-note-icon="${name}"]`);

    it('centres the icon in its box, scaled from a 20 unit drawing', () => {
        expect(icon('house')?.getAttribute('transform')).toBe(
            'translate(11.5 5) scale(1)',
        );
    });

    it('draws each icon in the ink and light of the note', () => {
        expect(icon('house')?.querySelectorAll('path')).toHaveLength(2);
        expect(icon('hotel')?.querySelectorAll('rect')).toHaveLength(3);
        expect(icon('key')?.querySelector('g')?.getAttribute('stroke')).toBe(
            '#111111',
        );
        expect(icon('die')?.querySelectorAll('circle')).toHaveLength(5);
        expect(icon('die')?.querySelector('circle')?.getAttribute('fill')).toBe(
            '#EEEEEE',
        );
    });
});

describe('tint', () => {
    it('mixes the ink with the paper', () => {
        expect(tint('#000000', '#FFFFFF', 0.5)).toBe('#808080');
        expect(tint('#000000', '#FFFFFF', 0)).toBe('#000000');
    });

    it('keeps the ink when either colour is not #RRGGBB', () => {
        expect(tint('black', '#FFFFFF', 0.5)).toBe('black');
        expect(tint('#000000', 'white', 0.5)).toBe('#000000');
    });
});

describe('RasterNotePattern', () => {
    it('keeps the vector lines unless a print sheet says so', () => {
        const { result } = renderHook(() => useContext(RasterNotePattern));

        expect(result.current).toBe(false);
    });
});

describe('useNoteWords', () => {
    it('spells out the value and names the note after play money without a bank or edition', () => {
        const { result } = renderHook(() => useNoteWords(100), {
            wrapper: sheet('nl'),
        });

        expect(result.current.bank).toBe('Honderd');
        expect(result.current.bankSlot).toBe('value-words');
        expect(result.current.noteName).toBe('speelgeld');
        expect(result.current.hasEdition).toBe(false);
        expect(result.current.title).toBe('Speelgeld');
        expect(result.current.money(5)).toBe('€\u00A05');
    });

    it('names the bank and the edition when they have a name', () => {
        const { result } = renderHook(
            () => useNoteWords(500, 'Bank van Ons', 'Zaterdagclub'),
            { wrapper: sheet('en') },
        );

        expect(result.current.bank).toBe('Bank van Ons');
        expect(result.current.bankSlot).toBe('bank-name');
        expect(result.current.noteName).toBe('play money');
        expect(result.current.hasEdition).toBe(true);
        expect(result.current.title).toBe('Zaterdagclub');
    });

    it('ignores blank names and uses the own currency name', () => {
        const { result } = renderHook(() => useNoteWords(7, '  ', ' '), {
            wrapper: sheet('en', { noteName: 'kus' }),
        });

        expect(result.current.bank).toBe('');
        expect(result.current.hasEdition).toBe(false);
        expect(result.current.noteName).toBe('kus');
        expect(result.current.title).toBe('Kus');
    });

    it('keeps play money when the own currency name is blank', () => {
        const { result } = renderHook(() => useNoteWords(1), {
            wrapper: sheet('en', { noteName: ' ' }),
        });

        expect(result.current.noteName).toBe('play money');
        expect(result.current.bank).toBe('One');
    });
});
