import { render, waitFor } from '@testing-library/react';

import type { PrintEdition } from '@/lib/print/composition';
import { PrintDocument, type PrintPayload } from './print-document';

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
});
