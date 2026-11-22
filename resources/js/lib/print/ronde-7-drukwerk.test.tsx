import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Board, edgeSides } from '@/components/render/board';
import { RulesBookletPage } from '@/components/render/rules-booklet';
import { TitleDeed } from '@/components/render/title-deed';
import { resolveEdition } from '@/lib/edition/resolve';
import { makeEdition } from '@/lib/edition/test-utils';
import { spaceAt } from '@/lib/game/standard-edition';
import { rulesContext } from '@/lib/render/rules-context';

import { DEFAULT_BOARD_PROFILE, lidForBoard, spaceRects } from './board';
import { composePages, type PrintEdition } from './composition';
import { partQuantity, withSetTotal } from './estimate';
import { BOOKLET_PAGE } from './extras';
import { labelSpan, pageLabel } from './labels';

const t = (key: string, replacements: Record<string, string | number> = {}) =>
    key === 'print.spec.per_set_total'
        ? ` per set, ${String(replacements['total'])} in totaal`
        : key;

/** Print-shop findings of round 6 (Ingrid) and the photo points of Kees, Sara and Aisha. */
describe('more sets on the print page (B250)', () => {
    const edition: PrintEdition = { elements: {} };

    it('gives the number per set and the total on every row that counts one set', () => {
        const board = partQuantity('board', 'printer', edition);

        expect(
            withSetTotal(
                '4 stuks · elk 248 × 248 mm · 3 mm afloop en snijtekens',
                'board',
                board,
                3,
                t,
            ),
        ).toBe(
            '4 stuks per set, 12 in totaal · elk 248 × 248 mm · 3 mm afloop en snijtekens',
        );
        expect(
            withSetTotal(
                "1 boekje · 16 pagina's A5",
                'rules_booklet',
                partQuantity('rules_booklet', 'printer', edition),
                3,
                t,
            ),
        ).toBe("1 boekje per set, 3 in totaal · 16 pagina's A5");
    });

    it('leaves one set, the cards, the money and the invitations alone', () => {
        const board = partQuantity('board', 'printer', edition);

        expect(withSetTotal('4 stuks', 'board', board, 1, t)).toBe('4 stuks');
        for (const part of ['cards', 'money', 'invitation'] as const) {
            expect(withSetTotal('180 kaarten', part, board, 3, t)).toBe(
                '180 kaarten',
            );
        }
    });
});

describe('prepress (B253)', () => {
    it('leaves the line off the sides of a space that lie on the cut edge', () => {
        const rects = spaceRects(DEFAULT_BOARD_PROFILE);
        const start = rects[0];
        const street = rects[1];
        if (start === undefined || street === undefined) {
            throw new Error('no spaces');
        }

        // A street on the bottom row faces the centre: its upright bottom is the edge of the board.
        expect(edgeSides(street, DEFAULT_BOARD_PROFILE)).toEqual(['bottom']);
        expect(edgeSides(start, DEFAULT_BOARD_PROFILE)).toHaveLength(2);
        // With a white rim of 5 mm, no line is on the edge.
        const rimmed = { ...DEFAULT_BOARD_PROFILE, border: 5 };
        const inset = spaceRects(rimmed)[1];
        if (inset === undefined) {
            throw new Error('no spaces');
        }
        expect(edgeSides(inset, rimmed)).toEqual([]);
    });

    it('draws no line on the outer edge of the board', () => {
        const { container } = render(
            <Board theme="classic" locale="nl" editionName="Westerveen" />,
        );
        const space = container.querySelector('[data-position="1"]');
        const lines = space?.querySelectorAll('[data-frame] line') ?? [];

        expect(lines).toHaveLength(3);
    });

    it('puts the label of a money sheet between the crop marks and numbers the sheets', () => {
        const pages = composePages('money', 'printer', {
            elements: {},
            moneyAmount: 'full',
        });
        const page = pages[0];
        if (page === undefined) {
            throw new Error('no money sheet');
        }
        const span = labelSpan(page);
        const middle = (span.left + span.right) / 2;
        const crossing = page.cropMarks.filter(
            (mark) =>
                Math.min(mark.y1, mark.y2) < 6 &&
                Math.max(mark.y1, mark.y2) > 1.5 &&
                mark.x1 > span.left &&
                mark.x1 < span.right,
        );

        expect(crossing).toEqual([]);
        expect(middle).not.toBeCloseTo(page.size.w / 2, 0);
        expect(
            pageLabel(page, 'nl', 'eur', undefined, {
                number: 3,
                of: pages.length,
            }),
        ).toContain(`vel 3 van ${String(pages.length)}`);
    });

    it('makes the booklet A5 of 148 mm, and folds it in the middle of A4 at home', () => {
        expect(BOOKLET_PAGE).toEqual({ w: 148, h: 210 });
        const [sheet] = composePages('rules_booklet', 'home', { elements: {} });

        expect(sheet?.size).toEqual({ w: 297, h: 210 });
        expect(sheet?.items.map((item) => item.trim.x)).toEqual([0.5, 148.5]);
        expect(sheet?.foldLines[0]?.x1).toBe(148.5);
    });

    it('puts a full-width deed photo under the title block, never behind it', () => {
        const space = spaceAt(1);
        if (space.type !== 'street') throw new Error('Street expected');
        const { container } = render(
            <TitleDeed
                theme="classic"
                locale="nl"
                space={space}
                side="front"
                photo={{ src: 'a.jpg', style: 'full' }}
            />,
        );
        const slot = container.querySelector<HTMLElement>('[data-photo]');

        // From under the block (21 mm) to the table (39 mm).
        expect(slot?.dataset['h']).toBe('18');
        expect(slot?.style.top).toBe('21mm');
    });
});

describe('box lid and booklet follow the edition (B254)', () => {
    it('gives an own board size a lid that fits it', () => {
        expect(lidForBoard(500)).toEqual(DEFAULT_BOARD_PROFILE.boxLid);
        expect(lidForBoard(510)).toEqual({ w: 272, h: 272 });
    });

    it("takes the board's own subtitle on the lid unless the lid has one", () => {
        const edition = {
            ...makeEdition(),
            parts: { ...makeEdition().parts, boxLid: true },
            elements: {
                board_center: { subtitle: 'Ons dorp in de jaren vijftig' },
            },
        };

        expect(resolveEdition(edition).boxLid?.subtitle).toBe(
            'Ons dorp in de jaren vijftig',
        );
        expect(
            resolveEdition({
                ...edition,
                elements: {
                    ...edition.elements,
                    box_lid: { subtitle: 'Kerst 2026' },
                },
            }).boxLid?.subtitle,
        ).toBe('Kerst 2026');
    });

    it('says on the cover as many players as inside', () => {
        const context = rulesContext(
            resolveEdition(makeEdition()),
            undefined,
            'four',
        );
        const { container } = render(
            <RulesBookletPage
                theme="classic"
                locale="nl"
                page={1}
                context={context}
            />,
        );

        expect(container.textContent).toContain(
            `Een spel voor 2 tot ${String(context.money?.maxPlayers)} spelers`,
        );
        expect(container.textContent).not.toContain('2 tot 8');
    });
});
