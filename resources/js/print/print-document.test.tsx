import { render, waitFor } from '@testing-library/react';

import { PAWN_SIZE_MM } from '@/components/render';

import type { PrintEdition } from '@/lib/print/composition';
import { TOKEN_SIZE } from '@/lib/print/composition';
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

function payload(
    part: PrintPayload['part'],
    set: PrintPayload['set'],
): PrintPayload {
    return { part, set, pageShaveMm: 0.05, edition };
}

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

        // 60 cards, a front and a back each.
        expect(pages).toHaveLength(120);
        expect(pages[0]?.style.width).toBe('69mm');
        expect(pages[0]?.style.height).toBe('93.95mm');
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

    it('draws crop marks on the home sheets', () => {
        const { container } = render(
            <PrintDocument payload={payload('cards', 'home')} />,
        );

        expect(container.querySelectorAll('[data-page]')).toHaveLength(15);
        expect(container.querySelectorAll('svg line').length).toBeGreaterThan(
            0,
        );
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

        expect(
            money.querySelectorAll('[data-element="banknote"]'),
        ).toHaveLength(210);

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

    it('prints the current names in the variables of a card text (B131)', () => {
        const renamed = {
            ...payload('cards', 'printer'),
            edition: {
                ...edition,
                elements: {
                    ...edition.elements,
                    'space.24': { name: 'Jalinkhof' },
                    'card.chance.01': {
                        text: 'Loop naar {space:24} en pak {currency}{amount}.',
                        amount: 75,
                    },
                },
            },
        };
        const { container } = render(<PrintDocument payload={renamed} />);

        expect(container.textContent).toContain(
            'Loop naar Jalinkhof en pak €75.',
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
