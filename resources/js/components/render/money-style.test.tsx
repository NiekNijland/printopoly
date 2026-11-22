import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MoneyStyle } from '@/lib/edition/part-styles';
import type { PhotoSource } from '@/lib/render/photo';
import { THEME_IDS } from '@/lib/render/themes';

import { Banknote, RasterNotePattern } from './banknote';

const STYLES: readonly MoneyStyle[] = ['vintage', 'modern', 'playful'];

const photo = (placement: 'framed' | 'full'): PhotoSource =>
    placement === 'full' ? { src: 'a.jpg', style: 'full' } : { src: 'a.jpg' };

function note(
    style: MoneyStyle | undefined,
    extra: Partial<Parameters<typeof Banknote>[0]> = {},
) {
    return render(
        <Banknote
            theme="classic"
            locale="nl"
            value={500}
            {...(style === undefined
                ? {}
                : { style: { parts: { money: style } } })}
            {...extra}
        />,
    ).container;
}

const slotText = (container: HTMLElement, name: string) =>
    [...container.querySelectorAll(`[data-slot="${name}"]`)].map(
        (node) => node.textContent,
    );

describe('money styles (B270)', () => {
    it.each(
        THEME_IDS.flatMap((theme) => STYLES.map((s) => [theme, s] as const)),
    )(
        'draws a %s note in style %s with the amount, the value, the bank, the edition and speelgeld',
        (theme, style) => {
            const { container } = render(
                <Banknote
                    theme={theme}
                    locale="nl"
                    value={500}
                    color="#F3F0A8"
                    bankName="Bank van de club"
                    editionName="Zaterdagclub"
                    style={{ parts: { money: style } }}
                />,
            );
            const root = container.firstElementChild as HTMLElement;

            // The paper keeps the colour of its value in every theme, Strak too (B85).
            expect(root.style.background.toUpperCase()).toBe('#F3F0A8');
            expect(slotText(container, 'value')).toEqual(['€ 500']);
            expect(
                slotText(container, 'corner-value').length,
            ).toBeGreaterThanOrEqual(2);
            expect(
                slotText(container, 'corner-value').every(
                    (text) => text === '500',
                ),
            ).toBe(true);
            expect(
                slotText(container, 'bank-name').map((text) =>
                    text?.toLowerCase(),
                ),
            ).toEqual(['bank van de club']);
            expect(
                slotText(container, 'edition-name').map((text) =>
                    text?.toLowerCase(),
                ),
            ).toEqual(['zaterdagclub']);
            expect(
                slotText(container, 'play-money').map((text) =>
                    text?.toLowerCase(),
                ),
            ).toEqual(['speelgeld']);
            expect(container.textContent).not.toMatch(/hasbro|monopoly|©/i);
        },
    );

    it('draws the theme exactly as before without a style', () => {
        const plain = note(undefined);
        expect(plain.querySelector('[data-pattern="rings"]')).not.toBeNull();
        expect(plain.querySelector('[data-pattern="net"]')).toBeNull();
        expect(plain.querySelector('[data-slot="badge"]')).toBeNull();
        expect(plain.querySelector('[data-slot="panel"]')).toBeNull();
    });

    it('says Speelgeld, or the own currency, on a note without an edition name', () => {
        for (const style of STYLES) {
            const plain = note(style);
            expect(plain.textContent?.toLowerCase()).toContain('speelgeld');
            const kus = note(style, { words: { noteName: 'Kus' } });
            expect(slotText(kus, 'edition-name')[0]?.toLowerCase()).toBe('kus');
        }
    });

    it('engraves Vintage: a net, rosettes, a rope border, a beaded oval and four cartouches', () => {
        const vintage = note('vintage');
        expect(vintage.querySelector('[data-pattern="net"]')).not.toBeNull();
        expect(
            vintage.querySelector('[data-pattern="rosette"]'),
        ).not.toBeNull();
        expect(vintage.querySelector('[data-pattern="rope"]')).not.toBeNull();
        expect(vintage.querySelector('[data-oval]')).not.toBeNull();
        expect(vintage.querySelector('[data-slot="beads"]')).not.toBeNull();
        expect(vintage.querySelectorAll('[data-corner]')).toHaveLength(4);
        expect(slotText(vintage, 'corner-value')).toHaveLength(4);
        // Two rules make the double border.
        expect(vintage.querySelectorAll('[data-frame]')).toHaveLength(2);
    });

    it('keeps Modern flat: a colour field, a panel and no line work', () => {
        const modern = note('modern');
        expect(modern.querySelector('[data-slot="quarter"]')).not.toBeNull();
        expect(modern.querySelector('[data-slot="panel"]')).not.toBeNull();
        expect(modern.querySelector('[data-slot="guilloche"]')).toBeNull();
        expect(
            modern.querySelector('path[d*="L"][stroke-width="0.09"]'),
        ).toBeNull();
    });

    it('makes Speels round: a badge, bubbles with the value and two icons, a pill and confetti', () => {
        const playful = note('playful');
        expect(playful.querySelector('[data-slot="badge"]')).not.toBeNull();
        expect(playful.querySelectorAll('[data-corner]')).toHaveLength(4);
        expect(playful.querySelectorAll('[data-note-icon]')).toHaveLength(2);
        expect(playful.querySelector('[data-slot="confetti"]')).not.toBeNull();
        expect(playful.querySelector('[data-slot="guilloche"]')).toBeNull();
    });

    it('puts a framed photo in the oval or badge, and a full one behind a light wash', () => {
        for (const style of ['vintage', 'playful'] as const) {
            expect(
                note(style, { photo: photo('framed') }).querySelector(
                    '[data-slot="oval-photo"]',
                ),
            ).not.toBeNull();
        }
        for (const style of STYLES) {
            const framed = note(style, { photo: photo('framed') });
            expect(slotText(framed, 'value')).toEqual(['€ 500']);
            const full = note(style, { photo: photo('full') });
            expect(
                full.querySelector('[data-slot="photo-wash"]'),
            ).not.toBeNull();
            expect(slotText(full, 'value')).toEqual(['€ 500']);
        }
    });

    it('draws the Vintage line work once per value as a picture on a print sheet', () => {
        const drawn: string[] = [];
        const getContext = vi
            .spyOn(HTMLCanvasElement.prototype, 'getContext')
            .mockImplementation(
                () =>
                    ({
                        scale: () => undefined,
                        fillRect: () => undefined,
                        save: () => undefined,
                        restore: () => undefined,
                        beginPath: () => undefined,
                        rect: () => undefined,
                        clip: () => undefined,
                        stroke: (path: { d: string }) => drawn.push(path.d),
                        setLineDash: () => undefined,
                    }) as unknown as CanvasRenderingContext2D,
            );
        const toDataURL = vi
            .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
            .mockImplementation(
                () => `data:image/png;base64,v${String(drawn.length)}`,
            );
        vi.stubGlobal(
            'Path2D',
            class {
                constructor(readonly d: string) {}
            },
        );

        try {
            const style = { parts: { money: 'vintage' as const } };
            const { container } = render(
                <RasterNotePattern.Provider value>
                    <Banknote
                        theme="classic"
                        locale="nl"
                        value={5}
                        style={style}
                    />
                    <Banknote
                        theme="classic"
                        locale="nl"
                        value={5}
                        style={style}
                    />
                    <Banknote
                        theme="classic"
                        locale="nl"
                        value={10}
                        style={style}
                    />
                </RasterNotePattern.Provider>,
            );
            const pictures = Array.from(
                container.querySelectorAll<HTMLImageElement>(
                    'img[data-slot="guilloche"]',
                ),
            );

            expect(container.querySelector('[data-pattern="net"]')).toBeNull();
            expect(pictures).toHaveLength(3);
            expect(pictures[0]?.src).toBe(pictures[1]?.src);
            expect(pictures[2]?.src).not.toBe(pictures[0]?.src);
            expect(toDataURL).toHaveBeenCalledTimes(2);
        } finally {
            getContext.mockRestore();
            toDataURL.mockRestore();
            vi.unstubAllGlobals();
        }
    });
});
