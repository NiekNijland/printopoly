import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CardStyle, DeedStyle } from '@/lib/render/edition-part-styles';
import type { PhotoSource } from '@/lib/render/photo';
import { deedsFor, standardEdition } from '@/lib/render/standard-edition';
import { THEME_IDS, type ThemeId } from '@/lib/render/themes';

import { GameCard } from './game-card';
import { TitleDeed } from './title-deed';

const STYLES = [undefined, 'vintage', 'modern', 'playful'] as const;

const photo: PhotoSource = {
    src: 'data:image/png;base64,AAAA',
    width: 800,
    height: 600,
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0, grayscale: false },
};

const payCard = standardEdition.decks.chest.find(
    (card) => (card.amount ?? 0) < 0,
);
const street = deedsFor()[0];
const station = deedsFor().find((space) => space.type === 'station');

function styleProp(cards?: CardStyle, deeds?: DeedStyle) {
    return cards === undefined && deeds === undefined
        ? {}
        : {
              style: {
                  parts: {
                      ...(cards === undefined ? {} : { cards }),
                      ...(deeds === undefined ? {} : { deeds }),
                  },
              },
          };
}

function card(
    style: CardStyle | undefined,
    side: 'front' | 'back',
    extra: Record<string, unknown> = {},
    theme: ThemeId = 'classic',
) {
    return render(
        <GameCard
            theme={theme}
            locale="nl"
            deck="chest"
            side={side}
            card={payCard}
            edition="Zaterdagclub"
            {...styleProp(style)}
            {...extra}
        />,
    ).container;
}

function deed(
    style: DeedStyle | undefined,
    side: 'front' | 'back',
    extra: Record<string, unknown> = {},
    theme: ThemeId = 'classic',
) {
    if (street === undefined) {
        throw new Error('no deeds');
    }

    return render(
        <TitleDeed
            theme={theme}
            locale="nl"
            space={street}
            side={side}
            {...styleProp(undefined, style)}
            {...extra}
        />,
    ).container;
}

const slot = (container: HTMLElement, name: string) =>
    container.querySelector(`[data-slot="${name}"]`);

describe('card and deed styles (B269)', () => {
    it.each(
        THEME_IDS.flatMap((theme) => STYLES.map((s) => [theme, s] as const)),
    )(
        'keeps every slot the checks read on a %s card and deed in style %s',
        (theme, style) => {
            const front = card(
                style,
                'front',
                { purpose: 'voor je les' },
                theme,
            );
            for (const name of ['title', 'text', 'amount']) {
                expect(slot(front, name)).not.toBeNull();
            }
            expect(slot(front, 'amount')?.textContent).toContain('Betaal');
            expect(slot(front, 'amount')?.textContent).toContain('voor je les');

            const back = card(style, 'back', {}, theme);
            expect(slot(back, 'title')?.textContent).toBe('Algemeen Fonds');
            expect(slot(back, 'edition')?.textContent).toBe('Zaterdagclub');

            const deedFront = deed(style, 'front', { town: 'Dorp' }, theme);
            for (const name of [
                'band',
                'label',
                'town',
                'name',
                'rule',
                'costs',
                'costs-note',
            ]) {
                expect(slot(deedFront, name)).not.toBeNull();
            }
            // Every rent row is still a row of its own, so the table reads at print size.
            expect(deedFront.querySelectorAll('[data-row]')).toHaveLength(9);

            const deedBack = deed(style, 'back', {}, theme);
            for (const name of [
                'mortgage-label',
                'mortgage',
                'mortgage-text',
            ]) {
                expect(slot(deedBack, name)).not.toBeNull();
            }
        },
    );

    it('draws the theme exactly as before without a style', () => {
        for (const container of [
            card(undefined, 'front'),
            card(undefined, 'back'),
            deed(undefined, 'front'),
            deed(undefined, 'back'),
        ]) {
            expect(slot(container, 'engraved-border')).toBeNull();
            expect(slot(container, 'tile')).toBeNull();
            expect(slot(container, 'confetti')).toBeNull();
        }
    });

    it('gives Vintage a guilloche border, a rosette and a cartouche for the amount', () => {
        const front = card('vintage', 'front');
        expect(slot(front, 'engraved-border')).not.toBeNull();
        expect(slot(front, 'cartouche')).not.toBeNull();

        const deedFront = deed('vintage', 'front');
        expect(slot(deedFront, 'engraved-border')).not.toBeNull();
        expect(slot(deedFront, 'hatch')).not.toBeNull();
        expect(slot(deed('vintage', 'back'), 'mortgage-box')).not.toBeNull();
    });

    it('draws the engraving of Vintage without SVG patterns, so a deck stays light in the PDF', () => {
        // Chrome draws a pattern out tile by tile in a PDF: a deck with a patterned border was tens of megabytes and
        // failed to print. The rope and the ground are a handful of paths and circles.
        for (const container of [
            card('vintage', 'front'),
            card('vintage', 'back'),
            deed('vintage', 'front'),
            deed('vintage', 'back'),
        ]) {
            expect(container.querySelectorAll('pattern')).toHaveLength(0);
            expect(container.querySelectorAll('svg *').length).toBeLessThan(
                260,
            );
        }
        // One ornament per side, which print draws as one picture (B269): on the front the border (the rope, three
        // rules, the corner squares and their diamonds), the watermark, the medallion rosette and its disc; on the
        // back also the ground, the oval with its two lines, the rosette and the disc.
        const ornament = (container: HTMLElement) =>
            container.querySelectorAll('[data-slot="engraved-border"] path');
        expect(ornament(card('vintage', 'front'))).toHaveLength(9);
        expect(ornament(card('vintage', 'back'))).toHaveLength(11);
    });

    it('gives Modern a block in the deck colour, an ink bar for the amount and a full colour back', () => {
        const front = card('modern', 'front');
        expect(slot(front, 'block')).not.toBeNull();
        expect(slot(front, 'amount-bar')).not.toBeNull();
        const back = card('modern', 'back').querySelector<HTMLElement>(
            '[data-element]',
        );
        // The back is the accent of Community Chest, into the bleed.
        expect(back?.style.background).toBe('#E6007E');
        expect(
            deed('modern', 'front').querySelector('[data-frame]'),
        ).toBeNull();
    });

    it('gives Speels a hand-drawn tile, a badge, a pill and an awning', () => {
        const front = card('playful', 'front');
        expect(slot(front, 'tile')).not.toBeNull();
        expect(slot(front, 'badge')).not.toBeNull();
        expect(slot(front, 'pill')).not.toBeNull();
        expect(slot(card('playful', 'back'), 'confetti')).not.toBeNull();
        expect(slot(deed('playful', 'front'), 'color-bar')).not.toBeNull();
        expect(slot(deed('playful', 'front'), 'rule')?.tagName).toBe('svg');
    });

    it('gives a station deed its block in every style', () => {
        if (station === undefined) {
            throw new Error('no station');
        }
        for (const style of ['vintage', 'modern', 'playful'] as const) {
            const container = render(
                <TitleDeed
                    theme="gala"
                    locale="nl"
                    space={station}
                    side="front"
                    style={{ parts: { deeds: style } }}
                />,
            ).container;
            expect(slot(container, 'band')).not.toBeNull();
            expect(container.querySelectorAll('[data-row]')).toHaveLength(4);
        }
    });

    it.each(STYLES)(
        'keeps a framed photo and a photo over the whole card in style %s',
        (style) => {
            const framed = card(style, 'front', { photo });
            expect(
                framed.querySelectorAll('[data-photo="filled"]'),
            ).toHaveLength(1);
            const full = card(style, 'front', {
                photo: { ...photo, style: 'full' },
            });
            expect(full.querySelectorAll('[data-photo="filled"]')).toHaveLength(
                1,
            );
            expect(slot(full, 'title-band')).not.toBeNull();
            expect(slot(full, 'text-panel')).not.toBeNull();

            const deedPhoto = deed(style, 'front', { photo });
            expect(
                deedPhoto.querySelectorAll('[data-photo="filled"]'),
            ).toHaveLength(1);
            const art = card(style, 'back', { photo });
            expect(slot(art, 'back-art')).not.toBeNull();
            expect(slot(art, 'title')?.textContent).toBe('Algemeen Fonds');
        },
    );
});
