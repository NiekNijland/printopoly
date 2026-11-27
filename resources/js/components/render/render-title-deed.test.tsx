import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { isOwnable, spaceAt } from '@/lib/render/standard-edition';
import { defined } from '@/testing/defined';
import { css, mmSize } from '@/testing/render-dom';
import type { OwnableSpace } from '@/types/game';
import { FitText } from './fit-text';
import { PhotoSlot } from './photo-slot';
import { Sheet } from './sheet';
import { TitleDeed } from './title-deed';

const base = { theme: 'classic', locale: 'nl' } as const;

const ownableAt = (position: number): OwnableSpace => {
    const space = spaceAt(position);

    if (!isOwnable(space)) {
        throw new Error(`Space ${String(position)} has no deed`);
    }

    return space;
};

describe('title deed', () => {
    it('follows the original (B133): label and name in capitals in the block, no price and no copyright', () => {
        const { container } = render(
            <TitleDeed {...base} space={ownableAt(1)} side="front" />,
        );

        expect(
            container.querySelector('[data-slot="label"]'),
        ).toHaveTextContent('EIGENDOMSBEWIJS');
        expect(container.querySelector('[data-slot="name"]')?.textContent).toBe(
            ownableAt(1).name.nl.toUpperCase(),
        );
        expect(
            container.querySelector<HTMLElement>('[data-slot="band"]')?.style
                .border,
        ).toContain('0.25mm');
        expect(container.querySelector('[data-slot="price"]')).toBeNull();
        expect(container.textContent).not.toMatch(/Hasbro|©/);
    });

    it('labels the deed in English', () => {
        const { container } = render(
            <TitleDeed
                theme="classic"
                locale="en"
                space={ownableAt(1)}
                side="front"
            />,
        );
        const rows = Array.from(
            container.querySelectorAll('[data-slot="costs"] [data-row]'),
        ).map((row) => row.textContent);

        expect(
            container.querySelector('[data-slot="label"]'),
        ).toHaveTextContent('TITLE DEED');
        expect(rows).toEqual(['Houses cost£50 each', 'Hotels cost£50 each']);
        expect(
            container.querySelector('[data-slot="costs-note"]'),
        ).toHaveTextContent('(plus 4 houses)');
    });

    it('lets the rent table use the space of a missing photo strip', () => {
        const top = (withPhoto: boolean) => {
            const { container } = render(
                <TitleDeed
                    {...base}
                    space={ownableAt(1)}
                    side="front"
                    photo={withPhoto ? { src: 'a.jpg' } : undefined}
                />,
            );
            const table = container.querySelector<HTMLElement>(
                '[data-slot="rent-table"]',
            );

            return parseFloat(table?.style.top ?? '0');
        };

        // The table sits in the middle of what is left, so without the strip it starts higher.
        expect(top(false)).toBeLessThan(top(true));
    });

    it('shows the rent table of the game data', () => {
        const { container } = render(
            <TitleDeed {...base} space={ownableAt(1)} side="front" />,
        );
        const table = container.querySelector<HTMLElement>(
            '[data-slot="rent-table"]',
        );
        const rows = Array.from(
            table?.querySelectorAll('[data-row]') ?? [],
        ).map((row) => row.textContent);

        expect(rows).toEqual([
            'Huur€\u00A02',
            'Huur met kleurgroep€\u00A04',
            'Huur met 1 huis€\u00A010',
            'Huur met 2 huizen€\u00A030',
            'Huur met 3 huizen€\u00A090',
            'Huur met 4 huizen€\u00A0160',
            'Huur met hotel€\u00A0250',
        ]);
        expect(
            Array.from(
                container.querySelectorAll('[data-slot="costs"] [data-row]'),
            ).map((row) => row.textContent),
        ).toEqual([
            'Kosten huis€\u00A050 per stuk',
            'Kosten hotel€\u00A050 per stuk',
        ]);
        expect(screen.getByText('(plus 4 huizen)')).toBeInTheDocument();
    });

    it('shows four rows for a station and none for a utility', () => {
        const station = render(
            <TitleDeed {...base} space={ownableAt(5)} side="front" />,
        );
        const utility = render(
            <TitleDeed {...base} space={ownableAt(12)} side="front" />,
        );

        expect(station.container.querySelectorAll('[data-row]')).toHaveLength(
            4,
        );
        expect(utility.container.querySelectorAll('[data-row]')).toHaveLength(
            0,
        );
    });

    it('shows the mortgage on the back', () => {
        const { container } = render(
            <TitleDeed {...base} space={ownableAt(1)} side="back" />,
        );

        expect(
            container.querySelector('[data-slot="mortgage"]'),
        ).toHaveTextContent('€ 30');
        expect(screen.getByText(/Aflossen kost € 33/)).toBeInTheDocument();
    });

    it('uses the group colour for the band', () => {
        const { container } = render(
            <TitleDeed {...base} space={ownableAt(39)} side="front" />,
        );

        expect(
            container.querySelector<HTMLElement>('[data-slot="band"]')?.style
                .background,
        ).toBe(css('#0072BB'));
    });
});

describe('PhotoSlot', () => {
    it('crops with pan, zoom, turn and black and white', () => {
        const { container } = render(
            <div>
                <PhotoSlot
                    x={0}
                    y={0}
                    w={40}
                    h={20}
                    photo={{
                        src: 'a.jpg',
                        width: 4000,
                        height: 3000,
                        transform: {
                            x: 0.5,
                            y: 0.5,
                            scale: 2,
                            rotation: 90,
                            grayscale: true,
                        },
                    }}
                />
            </div>,
        );
        const image = container.querySelector('img');

        expect(image?.style.transform).toBe('rotate(90deg)');
        expect(image?.style.filter).toBe('grayscale(1)');
        // Turned, the photo is 3000 x 4000 px: cover is 40 / 3000 mm/px, zoom 2 doubles it.
        expect(mmSize(defined(image))).toEqual(['106.667mm', '80mm']);
    });

    it('renders nothing without a photo', () => {
        const none = render(<PhotoSlot x={0} y={0} w={10} h={10} />);

        expect(none.container.firstElementChild).toBeNull();
    });
});

describe('FitText', () => {
    const slot = { x: 0, y: 0, w: 20, h: 5, maxFontMm: 4, minFontMm: 2 };

    const renderInSheet = (ui: React.ReactNode) => {
        return render(
            <Sheet
                {...base}
                element="test"
                widthMm={20}
                heightMm={5}
                background="#FFFFFF"
            >
                {ui}
            </Sheet>,
        );
    };

    it('keeps the maximum size for short text', () => {
        const { container } = renderInSheet(<FitText {...slot} text="Kans" />);

        expect(
            container.querySelector<HTMLElement>('[data-fits]')?.dataset
                .fontSizeMm,
        ).toBe('4');
    });

    it('shrinks long text and says when it does not fit even at the minimum size', () => {
        const onFit = vi.fn();
        const { container } = renderInSheet(
            <FitText {...slot} text={'tekst '.repeat(30)} onFit={onFit} />,
        );
        const box = container.querySelector<HTMLElement>('[data-fits]');

        expect(box?.dataset.fits).toBe('false');
        expect(box?.dataset.fontSizeMm).toBe('2');
        expect(Number(box?.dataset.overflowChars)).toBeGreaterThan(0);
        expect(onFit).toHaveBeenLastCalledWith(
            expect.objectContaining({ fits: false, fontSizeMm: 2 }),
        );
    });

    it('does not hyphenate', () => {
        const { container } = renderInSheet(
            <FitText
                {...slot}
                text="Hippopotomonstrosesquippedaliofobie"
                wrap="words"
            />,
        );

        expect(
            container.querySelector<HTMLElement>('[data-fits] > div')?.style
                .hyphens,
        ).toBe('none');
    });
});
