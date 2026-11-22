import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { resolveEdition } from '@/lib/edition/resolve';
import { makeEdition } from '@/lib/edition/test-utils';
import { TITLE_STYLES, type TitleStyle } from '@/lib/edition/types';
import { centerFoldItems } from '@/lib/editor/layers';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { THEME_IDS, type ThemeId } from '@/lib/render/themes';

import { BoardCenter, centerTitleOf, layoutOfTitle } from './board';
import { boardPropsOf, NO_PHOTOS } from './board-props';
import { BoxLid } from './box-lid';

const STYLES: readonly (TitleStyle | undefined)[] = [
    undefined,
    ...TITLE_STYLES,
];

const cases = THEME_IDS.flatMap((theme) =>
    STYLES.map((style) => [theme, style] as const),
);

/** Left, top, width and height in mm of an absolutely placed element. */
function boxOf(element: Element | null): {
    x: number;
    y: number;
    w: number;
    h: number;
} {
    const style = (element as HTMLElement | null)?.style;
    const value = (name: 'left' | 'top' | 'width' | 'height') =>
        Number.parseFloat(style?.[name] ?? 'NaN');

    return {
        x: value('left'),
        y: value('top'),
        w: value('width'),
        h: value('height'),
    };
}

describe('title style per element (Niek, 22 nov)', () => {
    it.each<readonly [ThemeId, TitleStyle | undefined]>(cases)(
        'draws the name on the board centre in %s with style %s inside the title area',
        (theme, style) => {
            const { container } = render(
                <BoardCenter
                    theme={theme}
                    locale="nl"
                    editionName="Beukerpoly"
                    title={{ style, subtitle: 'Sinds 1987' }}
                />,
            );
            const plate = container.querySelector(
                '[data-slot="edition-plate"]',
            );
            const name = plate?.querySelector('[data-slot="edition-name"]');
            const area = layoutOfTitle(DEFAULT_BOARD_PROFILE, {});

            expect(plate?.getAttribute('data-title-style')).toBe(
                style ?? 'theme',
            );
            expect(name?.textContent).toBe(
                style === 'stamp' || style === 'bar'
                    ? 'BEUKERPOLY'
                    : 'Beukerpoly',
            );
            expect(
                plate?.querySelector('[data-slot="edition-tagline"]')
                    ?.textContent,
            ).toMatch(/sinds 1987/i);

            // The plate, or the name for a style without one, stays in the box the fold check measures (B187).
            const inner =
                style === 'script' || style === 'plain'
                    ? boxOf(name ?? null)
                    : boxOf(plate);
            expect(inner.x).toBeGreaterThanOrEqual(-0.01);
            expect(inner.y).toBeGreaterThanOrEqual(-0.01);
            expect(inner.x + inner.w).toBeLessThanOrEqual(area.title.w + 0.01);
            expect(inner.y + inner.h).toBeLessThanOrEqual(area.title.h + 0.01);
        },
    );

    it.each<readonly [ThemeId, TitleStyle | undefined]>(cases)(
        'draws the name plate on a lid without a photo in %s with style %s',
        (theme, style) => {
            const { container } = render(
                <BoxLid
                    theme={theme}
                    locale="nl"
                    editionName="Beukerpoly"
                    titleStyle={style}
                />,
            );
            const plate = container.querySelector(
                '[data-slot="lid-plate"] [data-slot="edition-plate"]',
            );

            expect(plate?.getAttribute('data-title-style')).toBe(
                style ?? 'theme',
            );
            expect(
                plate
                    ?.querySelector('[data-slot="edition-name"]')
                    ?.textContent?.toLowerCase(),
            ).toBe('beukerpoly');
        },
    );

    it('keeps the style of the centre and the lid apart, from the edition to the print', () => {
        const edition = {
            ...makeEdition(),
            parts: { ...makeEdition().parts, boxLid: true },
            elements: {
                board_center: { titleStyle: 'stamp' as const },
                box_lid: { titleStyle: 'script' as const },
            },
        };
        const resolved = resolveEdition(edition);
        const board = boardPropsOf(resolved, NO_PHOTOS);

        expect(resolved.boardCenter.titleStyle).toBe('stamp');
        expect(resolved.boxLid?.titleStyle).toBe('script');
        expect(centerTitleOf(resolved.boardCenter, undefined).style).toBe(
            'stamp',
        );

        const { container } = render(
            <BoxLid
                {...board}
                theme="classic"
                locale="nl"
                editionName={resolved.name}
                titleStyle={resolved.boxLid?.titleStyle}
                board={board}
            />,
        );
        const styles = [
            ...container.querySelectorAll('[data-slot="edition-plate"]'),
        ].map((plate) => plate.getAttribute('data-title-style'));

        // The lid plate in script, and the board on the lid with its stamp.
        expect(styles).toEqual(expect.arrayContaining(['script', 'stamp']));
    });

    it('gives the same fold warnings whatever the style (B187)', () => {
        const base = makeEdition();
        const plain = centerFoldItems(base, resolveEdition(base).boardCenter);

        for (const titleStyle of TITLE_STYLES) {
            const edition = {
                ...base,
                elements: {
                    board_center: {
                        centerPlace: 'middle' as const,
                        titleStyle,
                    },
                },
            };
            const middle = {
                ...base,
                elements: { board_center: { centerPlace: 'middle' as const } },
            };

            expect(
                centerFoldItems(base, resolveEdition(base).boardCenter),
            ).toEqual(plain);
            expect(
                centerFoldItems(edition, resolveEdition(edition).boardCenter),
            ).toEqual(
                centerFoldItems(middle, resolveEdition(middle).boardCenter),
            );
        }
    });
});
