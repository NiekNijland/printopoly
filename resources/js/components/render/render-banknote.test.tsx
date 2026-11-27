import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RasterNotePattern } from '@/components/render/banknote-parts';
import { noteIcons, noteInk } from '@/lib/render/banknote-pattern';
import { lidLayout } from '@/lib/render/box-lid-layout';
import { mix } from '@/lib/render/color';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { THEMES, type ThemeId } from '@/lib/render/themes';
import { css, root } from '@/testing/render-dom';
import { Banknote, noteColor } from './banknote';
import { BoxLid } from './box-lid';

const base = { theme: 'classic', locale: 'nl' } as const;

const isContext2d = (value: object): value is CanvasRenderingContext2D =>
    'stroke' in value && 'clip' in value && 'scale' in value;

describe('banknote', () => {
    it('always carries the word speelgeld, or play money in English', () => {
        const nl = render(<Banknote {...base} value={100} />);
        const en = render(<Banknote theme="classic" locale="en" value={100} />);

        const edition = render(
            <Banknote {...base} value={100} editionName="Zaterdagclub" />,
        );

        expect(
            within(nl.container).getAllByText('Speelgeld').length,
        ).toBeGreaterThan(0);
        expect(
            within(en.container).getAllByText('Play money').length,
        ).toBeGreaterThan(0);
        expect(
            within(edition.container).getByText('speelgeld'),
        ).toBeInTheDocument();
    });

    it('says speelgeld once and spells out the value where the bank has no name (B270)', () => {
        for (const theme of ['classic', 'strak'] as const) {
            for (const editionName of [undefined, 'Zaterdagclub']) {
                const { container } = render(
                    <Banknote
                        theme={theme}
                        locale="nl"
                        value={100}
                        {...(editionName === undefined ? {} : { editionName })}
                    />,
                );

                expect(container.textContent.match(/speelgeld/gi)).toHaveLength(
                    1,
                );
                expect(
                    container.querySelector('[data-slot="bank-name"]'),
                ).toBeNull();
                expect(
                    container.querySelector('[data-slot="value-words"]')
                        ?.textContent,
                ).toBe('Honderd');
            }
        }
    });

    it('takes the note colour from the game data unless the edition picks another', () => {
        const standard = render(<Banknote {...base} value={100} />);
        const custom = render(
            <Banknote {...base} value={100} color="#EBD7F0" />,
        );

        expect(root(standard.container).style.background).toBe(css('#D3E4F5'));
        expect(root(custom.container).style.background).toBe(css('#EBD7F0'));
    });

    it('draws its own double frame and shows the bank name', () => {
        const { container } = render(
            <Banknote
                {...base}
                value={50}
                bankName="Bank van de Zaterdagclub"
            />,
        );

        expect(container.querySelectorAll('[data-frame]')).toHaveLength(2);
        expect(
            screen.getByText('Bank van de Zaterdagclub'),
        ).toBeInTheDocument();
        expect(screen.getByText('€ 50')).toBeInTheDocument();
    });

    it('follows the original note: oval, two value boxes, two icons and a strip (B137)', () => {
        const { container } = render(
            <Banknote
                {...base}
                value={500}
                editionName="Zaterdagclub"
                bankName="Bank van de club"
            />,
        );
        const slotText = (name: string) =>
            [...container.querySelectorAll(`[data-slot="${name}"]`)].map(
                (node) => node.textContent,
            );

        expect(container.querySelector('[data-oval]')).not.toBeNull();
        expect(slotText('value')).toEqual(['€\u00A0500']);
        expect(slotText('bank-name')).toEqual(['Bank van de club']);
        expect(slotText('corner-value')).toEqual(['500', '500']);
        expect(container.querySelectorAll('[data-note-icon]')).toHaveLength(2);
        expect(slotText('edition-name')).toEqual(['Zaterdagclub']);
        expect(slotText('play-money')).toEqual(['speelgeld']);
        expect(container.textContent).not.toMatch(/hasbro|monopoly|©/i);
    });

    it('draws a guilloche in a dark shade of the paper, and none in Strak (B255)', () => {
        const classic = render(<Banknote {...base} value={100} />);
        const strak = render(
            <Banknote
                theme="strak"
                locale="nl"
                value={100}
                editionName="Zaterdagclub"
            />,
        );
        const rings = (container: HTMLElement) =>
            container.querySelector('[data-pattern="rings"]');

        expect(
            rings(classic.container)?.getAttribute('d')?.length,
        ).toBeGreaterThan(0);
        expect(
            classic.container.querySelector('[data-pattern="rosette"]'),
        ).not.toBeNull();
        // Strak is flat and typographic (Tom, ronde 6): no guilloche, no ornaments, no icons.
        expect(
            strak.container.querySelector('[data-slot="guilloche"]'),
        ).toBeNull();
        expect(strak.container.querySelector('[data-note-icon]')).toBeNull();
        expect(strak.container.querySelector('[data-oval]')).toBeNull();
        expect(
            strak.container.querySelector<HTMLElement>(
                '[data-slot="value-block"]',
            )?.style.background,
        ).toBe(css(noteColor(100)));
        const slot = (name: string) =>
            [...strak.container.querySelectorAll(`[data-slot="${name}"]`)].map(
                (node) => node.textContent.replace(/\s/g, ' '),
            );
        expect(slot('value')).toEqual(['€ 100']);
        expect(slot('edition-name')).toEqual(['Zaterdagclub']);
        expect(slot('play-money')).toEqual(['speelgeld']);
        // A lighter tone of the ink, mixed with the paper rather than drawn with opacity.
        expect(rings(classic.container)?.getAttribute('stroke')).toBe(
            mix(noteInk('#D3E4F5', '#000000'), '#D3E4F5', 0.5),
        );
        expect(rings(classic.container)?.getAttribute('opacity')).toBeNull();
    });

    it.each<ThemeId>(['classic', 'riso', 'strak', 'gala'])(
        'puts the board, the name plate and the street colours on a lid without a photo in %s (B256)',
        (theme) => {
            const { container } = render(
                <BoxLid theme={theme} locale="nl" editionName="Zaterdagclub" />,
            );

            expect(
                container.querySelector(
                    '[data-slot="lid-board"] [data-element="board"]',
                ),
            ).not.toBeNull();
            expect(
                container.querySelector(
                    '[data-slot="lid-plate"] [data-slot="edition-name"]',
                )?.textContent,
            ).toBe('Zaterdagclub');
            expect(
                container.querySelector('[data-slot="lid-strip"]')?.children,
            ).toHaveLength(8);
        },
    );

    it('puts the logo of the board in the place of the board picture on the lid (B241, B256)', () => {
        const { container } = render(
            <BoxLid
                theme="gala"
                locale="nl"
                editionName="Zaterdagclub"
                photo={{ src: 'logo.png' }}
                logo
            />,
        );
        const picture = lidLayout(DEFAULT_BOARD_PROFILE.boxLid, {
            photo: 'none',
            subtitle: true,
            lines: false,
        }).picture;
        const photo = container.querySelector<HTMLElement>(
            '[data-photo="filled"]',
        );

        expect(container.querySelector('[data-slot="lid-board"]')).toBeNull();
        expect(photo?.dataset.w).toBe(String(picture?.w));
        expect(photo?.dataset.h).toBe(String(picture?.h));
        expect(
            container.querySelector(
                '[data-slot="lid-plate"] [data-slot="edition-name"]',
            )?.textContent,
        ).toBe('Zaterdagclub');
        expect(
            container.querySelector('[data-slot="lid-strip"]')?.children,
        ).toHaveLength(8);
    });

    it('draws the guilloche once per value as a picture on a print sheet (bug 3 of round 4)', () => {
        const drawn: string[] = [];
        const context = {
            scale: vi.fn(),
            fillRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            rect: vi.fn(),
            clip: vi.fn(),
            stroke: vi.fn(),
            set fillStyle(_value: string) {},
            set strokeStyle(value: string) {
                drawn.push(value);
            },
            set lineWidth(_value: number) {},
        };
        if (!isContext2d(context)) {
            throw new Error('no 2d context');
        }
        const getContext = vi
            .spyOn(HTMLCanvasElement.prototype, 'getContext')
            .mockReturnValue(context);
        const toDataURL = vi
            .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
            .mockImplementation(
                () => `data:image/png;base64,${String(drawn.length)}`,
            );
        vi.stubGlobal(
            'Path2D',
            class {
                constructor(readonly d: string) {}
            },
        );

        try {
            const { container } = render(
                <RasterNotePattern.Provider value>
                    <Banknote {...base} value={20} />
                    <Banknote {...base} value={20} />
                    <Banknote {...base} value={50} />
                </RasterNotePattern.Provider>,
            );
            const pictures = Array.from(
                container.querySelectorAll<HTMLImageElement>(
                    'img[data-slot="guilloche"]',
                ),
            );

            // No line work per note: one picture each, the same for the same value.
            expect(
                container.querySelector('[data-pattern="rings"]'),
            ).toBeNull();
            expect(pictures).toHaveLength(3);
            expect(pictures[0]?.src).toBe(pictures[1]?.src);
            expect(pictures[2]?.src).not.toBe(pictures[0]?.src);
            expect(toDataURL).toHaveBeenCalledTimes(2);
        } finally {
            getContext.mockRestore();
            toDataURL.mockRestore();
        }
    });

    it('keeps the vector guilloche where no canvas can draw it', () => {
        const { container } = render(
            <RasterNotePattern.Provider value>
                <Banknote {...base} value={10} />
            </RasterNotePattern.Provider>,
        );

        expect(
            container.querySelector('[data-pattern="rings"]'),
        ).not.toBeNull();
    });

    it('prints the pattern of a Riso note in the second ink, off register', () => {
        const { container } = render(
            <Banknote theme="riso" locale="nl" value={100} />,
        );
        const rings = container.querySelector('[data-pattern="rings"]');
        const layer = container.querySelector<HTMLElement>(
            '[data-slot="guilloche"]',
        );

        expect(rings?.getAttribute('stroke')).toBe(
            mix(THEMES.riso.accent, '#D3E4F5', 0.4),
        );
        expect(layer?.style.left).toBe('0.35mm');
    });

    it('gives every value its own pair of corner icons', () => {
        const pairs = [1, 5, 10, 20, 50, 100, 500].map((value) =>
            noteIcons(value).join('+'),
        );

        expect(new Set(pairs).size).toBeGreaterThan(1);
        expect(noteIcons(500)).toEqual(noteIcons(500));
    });
});
