import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

import { withAlpha } from '@/lib/render/color';
import type { BoxLidStyle } from '@/lib/render/edition-part-styles';
import { standardEdition } from '@/lib/render/standard-edition';
import { THEMES, type ThemeId } from '@/lib/render/themes';
import { css } from '@/testing/render-dom';

import { ruleColor } from './board-look';
import { vintageLid } from './box-lid-colors';
import {
    FullPhotoFrame,
    LidBackground,
    LidFrame,
    LidStrip,
    PhotoMat,
    bandStyle,
} from './box-lid-look';
import { blockColor, vintagePaper } from './piece-styles';
import { Sheet } from './sheet';

const classic = THEMES.classic;
const rect = { x: 20, y: 200, w: 160, h: 12 };

const inTheme = (theme: ThemeId, children: ReactNode) =>
    render(
        <Sheet
            element="lid"
            theme={theme}
            locale="nl"
            widthMm={200}
            heightMm={260}
            background="#fff"
        >
            {children}
        </Sheet>,
    ).container;

const slot = (container: HTMLElement, name: string) =>
    container.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe('LidBackground', () => {
    it('lays cream paper over the lid and its bleed in Vintage only', () => {
        const container = inTheme(
            'classic',
            <LidBackground look="vintage" w={200} h={260} bleed={3} />,
        );
        const paper = slot(container, 'lid-paper');

        expect(paper?.style.background).toBe(css(vintageLid(classic)));
        expect(paper?.style.left).toBe('-3mm');
        expect(paper?.style.width).toBe('206mm');
        expect(paper?.style.height).toBe('266mm');
    });

    it.each(['modern', 'playful', undefined] as const)(
        'draws nothing in style %s',
        (look) => {
            const { container } = render(
                <LidBackground look={look} w={200} h={260} bleed={3} />,
            );

            expect(container).toBeEmptyDOMElement();
        },
    );
});

describe('LidFrame', () => {
    it.each([
        ['vintage', 'lid-border'],
        ['modern', 'lid-discs'],
        ['playful', 'lid-doily'],
    ] as const)('draws the %s frame as %s', (look, name) => {
        const { container } = render(
            <LidFrame look={look} w={200} h={260} bleed={3} />,
        );

        expect(slot(container, name)).not.toBeNull();
        expect(container.querySelector('[data-frame]')).toBeNull();
    });

    it('draws the line of the theme 6 mm inside the edge without a style', () => {
        const container = inTheme(
            'classic',
            <LidFrame look={undefined} w={200} h={260} bleed={3} />,
        );
        const frame = container.querySelector<SVGElement>('[data-frame]');

        expect(frame?.style.left).toBe('6mm');
        expect(frame?.style.width).toBe('188mm');
        expect(frame?.querySelector('rect')?.getAttribute('stroke')).toBe(
            classic.ink,
        );
        expect(frame?.querySelector('rect')?.getAttribute('stroke-width')).toBe(
            String(classic.frameMm + 0.2),
        );
        expect(frame?.querySelector('[data-ornament]')).toBeNull();
    });

    it('draws the frame in the accent with an ornament line on a theme with an ornament', () => {
        const container = inTheme(
            'gala',
            <LidFrame look={undefined} w={200} h={260} bleed={3} />,
        );
        const frame = container.querySelector('[data-frame]');

        expect(frame?.querySelector('rect')?.getAttribute('stroke')).toBe(
            THEMES.gala.accent,
        );
        expect(frame?.querySelector('[data-ornament]')).not.toBeNull();
    });
});

describe('FullPhotoFrame', () => {
    it('draws a double paper rule with four diamonds in Vintage', () => {
        const { container } = render(
            <FullPhotoFrame look="vintage" w={200} h={260} />,
        );
        const border = slot(container, 'lid-border');
        const rules = border?.querySelectorAll('rect');

        expect(rules).toHaveLength(2);
        expect(rules?.[0]?.getAttribute('x')).toBe('5');
        expect(rules?.[1]?.getAttribute('x')).toBe('6.2');
        expect(rules?.[0]?.getAttribute('stroke')).toBe(classic.paper);
        expect(border?.querySelectorAll('path')).toHaveLength(4);
    });

    it('draws nothing in Modern', () => {
        const { container } = render(
            <FullPhotoFrame look="modern" w={200} h={260} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('draws a rounded dashed stitch in Speels', () => {
        const { container } = render(
            <FullPhotoFrame look="playful" w={200} h={260} />,
        );
        const stitch = slot(container, 'lid-stitch')?.querySelector('rect');

        expect(stitch?.getAttribute('rx')).toBe('5');
        expect(stitch?.getAttribute('stroke-dasharray')).toBe('3 2.2');
        expect(stitch?.getAttribute('width')).toBe('186');
    });

    it('draws a plain paper line without a style', () => {
        const { container } = render(
            <FullPhotoFrame look={undefined} w={200} h={260} />,
        );

        expect(
            container
                .querySelector('[data-frame] rect')
                ?.getAttribute('stroke'),
        ).toBe(classic.paper);
    });
});

describe('bandStyle', () => {
    it('gives Vintage warm paper between two double rules', () => {
        const band = bandStyle('vintage', classic, 0.8);

        expect(band.inset).toBe(0);
        expect(band.style.background).toBe(
            withAlpha(vintagePaper(classic.paper), 0.8),
        );
        expect(band.style.borderTop).toBe(`1.2mm double ${ruleColor(classic)}`);
        expect(band.style.borderBottom).toBe(band.style.borderTop);
    });

    it('gives Modern a heavy top bar in the block colour', () => {
        const band = bandStyle('modern', classic, 0.8);

        expect(band.style.borderTop).toBe(`2.4mm solid ${blockColor(classic)}`);
        expect(band.style.borderBottom).toBeUndefined();
    });

    it('gives Speels an inset rounded band with an ink edge', () => {
        const band = bandStyle('playful', classic, 0.8);

        expect(band.inset).toBe(9);
        expect(band.style.borderRadius).toBe('8mm');
        expect(band.style.border).toBe(`0.5mm solid ${classic.ink}`);
    });

    it('keeps only the see-through paper without a style', () => {
        expect(bandStyle(undefined, classic, 0.5)).toEqual({
            inset: 0,
            style: { background: withAlpha(classic.paper, 0.5) },
        });
    });
});

describe('LidStrip', () => {
    const strip = (look: BoxLidStyle | undefined) =>
        slot(
            render(
                <LidStrip look={look} rect={rect} w={200} h={260} bleed={3} />,
            ).container,
            'lid-strip',
        );

    it('draws one block per street group inside the strip', () => {
        const blocks = strip(undefined);

        expect(blocks?.children).toHaveLength(standardEdition.groups.length);
        expect(blocks?.style.left).toBe('20mm');
        expect(blocks?.style.gap).toBe('1mm');
        expect(blocks?.querySelector('[data-slot="hatch"]')).toBeNull();
    });

    it('runs a Modern band from the strip to the bleed', () => {
        const band = strip('modern');

        expect(band?.style.left).toBe('-3mm');
        expect(band?.style.width).toBe('206mm');
        expect(band?.style.height).toBe('63mm');
    });

    it('rounds the blocks of Speels into pills with an ink edge and a wider gap', () => {
        const pills = strip('playful');
        const first = pills?.querySelector('span');

        expect(pills?.style.gap).toBe('1.6mm');
        expect(first?.style.borderRadius).toBe('6mm');
    });

    it('hatches every Vintage block', () => {
        expect(
            strip('vintage')?.querySelectorAll('[data-slot="hatch"]'),
        ).toHaveLength(standardEdition.groups.length);
    });
});

describe('PhotoMat', () => {
    it('lays two engraved rules around a Vintage photo', () => {
        const { container } = render(<PhotoMat look="vintage" rect={rect} />);
        const rules = slot(container, 'photo-edge')?.querySelectorAll('rect');

        expect(rules).toHaveLength(2);
        expect(rules?.[0]?.getAttribute('stroke')).toBe(ruleColor(classic));
        expect(rules?.[1]?.getAttribute('stroke')).toBe(classic.paper);
    });

    it('rounds the edge of a Speels photo and tapes its corners', () => {
        const { container } = render(<PhotoMat look="playful" rect={rect} />);

        expect(
            slot(container, 'photo-edge')
                ?.querySelector('rect')
                ?.getAttribute('rx'),
        ).toBe('6');
        expect(slot(container, 'tape')).not.toBeNull();
    });

    it.each(['modern', undefined] as const)(
        'draws no mat in style %s',
        (look) => {
            const { container } = render(<PhotoMat look={look} rect={rect} />);

            expect(container).toBeEmptyDOMElement();
        },
    );
});
