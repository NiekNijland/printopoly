import { render, waitFor } from '@testing-library/react';

import { PAWN_SIZE_MM } from '@/components/render/pawn';

import type { PrintEdition } from '@/lib/render/print-composition';
import { TOKEN_SIZE } from '@/lib/render/print-page-frame';
import {
    cullOutsidePages,
    PrintDocument,
    type PrintPayload,
} from './print-document';

const edition: PrintEdition = {
    elements: {
        'deed.01': {
            photo: {
                photoId: 'photo-ref-0001',
                src: 'http://127.0.0.1/print-render/x.jpg',
            },
        },
    },
};

const payload = (
    part: PrintPayload['part'],
    set: PrintPayload['set'],
): PrintPayload => {
    return { part, set, pageShaveMm: 0.05, edition };
};

describe('PrintDocument', () => {
    beforeEach(() => {
        delete window.printReady;
        delete window.printError;
        // happy-dom has no font loading API; Chrome does.
        Object.defineProperty(document, 'fonts', {
            value: { ready: Promise.resolve() },
            configurable: true,
        });
    });

    it('draws one page per card side at true size, a hair shorter than the sheet (B56, B63)', () => {
        const { container } = render(
            <PrintDocument payload={payload('cards', 'printer')} />,
        );
        const pages = container.querySelectorAll<HTMLElement>('[data-page]');

        // 60 cards, a front and a back each, with 6 mm for the crop marks around the bleed (B160).
        expect(pages).toHaveLength(120);
        expect(pages[0]?.style.width).toBe('81mm');
        expect(pages[0]?.style.height).toBe('105.95mm');
        expect(pages[0]?.querySelectorAll('svg line')).toHaveLength(8);
    });

    it('breaks after every page but the last, so Chrome adds no blank page', () => {
        const { container } = render(
            <PrintDocument payload={payload('cards', 'printer')} />,
        );
        const pages = [
            ...container.querySelectorAll<HTMLElement>('[data-page]'),
        ];

        expect(
            pages
                .slice(0, -1)
                .every((page) => page.style.breakAfter === 'page'),
        ).toBe(true);
        expect(pages.at(-1)?.style.breakAfter).toBe('auto');
    });

    it('shows the cropped photo of the element', () => {
        const { container } = render(
            <PrintDocument payload={payload('cards', 'printer')} />,
        );

        expect(container.querySelector('img')?.getAttribute('src')).toBe(
            'http://127.0.0.1/print-render/x.jpg',
        );
    });

    it('draws crop marks on the home sheets, after the alignment test (B134)', () => {
        const { container } = render(
            <PrintDocument payload={payload('cards', 'home')} />,
        );

        expect(container.querySelectorAll('[data-page]')).toHaveLength(16);
        expect(
            container.querySelectorAll('[data-alignment] [data-target]'),
        ).toHaveLength(10);
        expect(container.querySelectorAll('svg line').length).toBeGreaterThan(
            0,
        );
    });

    it('keeps the text of the alignment test clear of the card frames (bug 35 of test round 3)', () => {
        const { container } = render(
            <PrintDocument payload={payload('cards', 'home')} />,
        );

        for (const art of container.querySelectorAll<HTMLElement>(
            '[data-alignment]',
        )) {
            const text = art.querySelector<HTMLElement>(
                '[data-alignment-text]',
            )!;
            const box = {
                x: parseFloat(text.style.left),
                y: parseFloat(text.style.top),
                w: parseFloat(text.style.width),
                h: parseFloat(text.style.height),
            };
            const frames = [...art.querySelectorAll('rect')].map((rect) => ({
                x: Number(rect.getAttribute('x')),
                y: Number(rect.getAttribute('y')),
                w: Number(rect.getAttribute('width')),
                h: Number(rect.getAttribute('height')),
            }));
            const overlaps = frames.filter(
                (frame) =>
                    frame.x < box.x + box.w &&
                    box.x < frame.x + frame.w &&
                    frame.y < box.y + box.h &&
                    box.y < frame.y + frame.h,
            );

            expect(frames).toHaveLength(8);
            expect(overlaps).toEqual([]);
        }
    });

    it('draws the test sheet with the own name of the start corner and the first space (R5-26, B231)', () => {
        const { container } = render(
            <PrintDocument
                payload={{
                    ...payload('calibration', 'home'),
                    edition: {
                        elements: {
                            'space.00': { name: 'Vertrek' },
                            'space.01': { name: 'Bakkerij Jansen' },
                        },
                    },
                }}
            />,
        );

        expect(container.textContent).toContain('Vertrek');
        expect(container.textContent).toContain('Bakkerij Jansen');
        expect(container.textContent).not.toContain('Molenweg');
    });

    it('sets window.printReady once fonts and images are done (B54)', async () => {
        render(<PrintDocument payload={payload('calibration', 'home')} />);

        await waitFor(() => {
            expect(window.printReady).toBe(true);
        });
        expect(window.printError).toBeUndefined();
    });

    it('draws the real renderers: deeds, board panels with their spaces, notes and the lid', () => {
        const cards = render(
            <PrintDocument payload={payload('cards', 'printer')} />,
        ).container;

        expect(
            cards.querySelector('[data-element="deed-street-front"]'),
        ).not.toBeNull();
        expect(
            cards.querySelector('[data-element="deed-street-back"]'),
        ).not.toBeNull();
        expect(
            cards.querySelector('[data-element="card-chance-front"]'),
        ).not.toBeNull();

        const board = render(
            <PrintDocument payload={payload('board', 'printer')} />,
        ).container;

        expect(board.querySelectorAll('[data-element="board"]')).toHaveLength(
            4,
        );
        expect(
            board.querySelectorAll('[data-element^="space-"]').length,
        ).toBeGreaterThan(100);

        const money = render(
            <PrintDocument payload={payload('money', 'printer')} />,
        ).container;

        // The full bank at the print shop (B156).
        expect(
            money.querySelectorAll('[data-element="banknote"]'),
        ).toHaveLength(306);

        const lid = render(
            <PrintDocument payload={payload('box_lid', 'printer')} />,
        ).container;

        expect(lid.querySelector('[data-element="box-lid"]')).not.toBeNull();
    });

    it('turns the artwork of a home sticker with the board side it sits on', () => {
        const { container } = render(
            <PrintDocument payload={payload('board', 'home')} />,
        );
        const stickers = container.querySelectorAll('[data-item^="space."]');

        expect(stickers).toHaveLength(40);
        expect(
            container.querySelectorAll('[data-item^="center."]'),
        ).toHaveLength(4);
    });

    it('prints the name of the edition language on the sheets', () => {
        const english = {
            ...payload('money', 'home'),
            edition: { ...edition, language: 'en' },
        };
        const { container } = render(<PrintDocument payload={english} />);

        expect(container.textContent).toContain('Play money');
    });

    it('prints the amounts of the edition on the board (B132)', () => {
        const changed = {
            ...payload('board', 'printer'),
            edition: {
                ...edition,
                elements: {
                    'space.00': { amounts: { salary: 180 } },
                    'space.04': { amounts: { amount: 220 } },
                    'space.01': { amounts: { price: 70 } },
                },
            },
        };
        const { container } = render(<PrintDocument payload={changed} />);
        const text = container.textContent;

        expect(text).toContain('€\u00A0180');
        expect(text).toContain('Betaal €\u00A0220');
        expect(text).toContain('€\u00A070');
    });

    it('prints the amounts of the edition on deeds and cards, with what the money is for (B132)', () => {
        const changed = {
            ...payload('cards', 'printer'),
            edition: {
                ...edition,
                elements: {
                    ...edition.elements,
                    'space.01': { amounts: { 'rent.5': 280, mortgage: 34 } },
                    'card.chest.03': { amount: -55, purpose: 'je tandarts' },
                },
            },
        };
        const { container } = render(<PrintDocument payload={changed} />);
        const text = container.textContent;

        expect(text).toContain('Huur met hotel€\u00A0280');
        expect(text).toContain('Aflossen kost €\u00A037:');
        expect(text).toContain('Betaal €\u00A055 voor je tandarts');
        // The story does not say the amount a second time.
        expect(text).toContain('Een bezoek aan de tandarts.Betaal €\u00A055');
        // Other cards keep their standard amount line.
        expect(text).toContain(
            'Te hard gereden. Dat wordt een boete.Betaal €\u00A015',
        );
    });

    it('prints the current names in the variables of a card text (B131)', () => {
        const renamed = {
            ...payload('cards', 'printer'),
            edition: {
                ...edition,
                elements: {
                    ...edition.elements,
                    'space.24': { name: 'Jalinkhof' },
                    'card.chance.07': {
                        text: 'Loop naar {space:24} en pak {currency}{amount}.',
                        amount: 55,
                    },
                },
            },
        };
        const { container } = render(<PrintDocument payload={renamed} />);

        expect(container.textContent).toContain(
            'Loop naar Jalinkhof en pak €55.',
        );
        expect(container.textContent).not.toContain('{space:24}');
        // The standard texts name the renamed space as well.
        expect(container.textContent).toContain('Wandel naar Jalinkhof.');
    });

    it('draws a pawn as large as the page plan assumes', () => {
        expect(TOKEN_SIZE).toEqual({ w: PAWN_SIZE_MM.w, h: PAWN_SIZE_MM.h });
    });

    it('hides what lies completely outside its page, because Chrome would shrink every page for it', () => {
        const root = document.createElement('div');

        root.innerHTML =
            '<section data-page><div id="inside"></div><div id="partly"></div><div id="outside"><span id="child"></span></div></section>';
        document.body.append(root);

        const rect = (left: number, right: number): DOMRect =>
            ({
                left,
                right,
                top: 0,
                bottom: 10,
                width: right - left,
                height: 10,
            }) as DOMRect;
        const place = (selector: string, left: number, right: number) => {
            const element = root.querySelector(selector) as HTMLElement;

            element.getBoundingClientRect = () => rect(left, right);
        };

        place('section', 0, 100);
        place('#inside', 10, 50);
        place('#partly', 80, 140);
        place('#outside', 120, 200);
        place('#child', 130, 150);

        expect(cullOutsidePages(root)).toBe(1);
        expect(
            (root.querySelector('#outside') as HTMLElement).style.display,
        ).toBe('none');
        expect(
            (root.querySelector('#partly') as HTMLElement).style.display,
        ).toBe('');
        root.remove();
    });
});
