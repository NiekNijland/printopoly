import { waitFor } from '@testing-library/react';

const { loadPrintFonts } = vi.hoisted(() => ({
    loadPrintFonts: vi.fn<(assetBase?: string) => Promise<void>>(),
}));

vi.mock('@/features/print/fonts', () => ({ loadPrintFonts }));

const printPayload = {
    part: 'cards',
    set: 'printer',
    pageShaveMm: 0.05,
    assetBase: 'http://127.0.0.1/build',
    edition: { elements: {} },
};

const sharePayload = {
    part: 'share',
    set: 'printer',
    pageShaveMm: 0.5,
    labels: { kicker: 'Our own edition', footer: 'printopoly.nl' },
    edition: { name: 'Street party', language: 'en', elements: {} },
};

const start = async (payload: unknown, withRoot = true): Promise<void> => {
    window.__PRINT__ = payload;
    document.body.innerHTML = withRoot ? '<div id="print-root"></div>' : '';
    vi.resetModules();
    await import('./print');
};

describe('the print page entry', () => {
    beforeEach(() => {
        delete window.__PRINT__;
        delete window.printReady;
        delete window.printError;
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', false);
        loadPrintFonts.mockReset();
        loadPrintFonts.mockResolvedValue(undefined);
        Object.defineProperty(document, 'fonts', {
            value: { ready: Promise.resolve() },
            configurable: true,
        });
    });

    it('reports an error and is ready at once when there is no payload', async () => {
        await start(undefined);

        expect(window.printError).toBe('The print page has no data.');
        expect(window.printReady).toBe(true);
        expect(loadPrintFonts).not.toHaveBeenCalled();
    });

    it('reports an error when the page has no root to draw in', async () => {
        await start(printPayload, false);

        expect(window.printError).toBe('The print page has no data.');
        expect(window.printReady).toBe(true);
    });

    it('loads the fonts from the asset base, then draws the print pages', async () => {
        await start(printPayload);

        expect(loadPrintFonts).toHaveBeenCalledWith('http://127.0.0.1/build');
        await waitFor(() => {
            expect(document.querySelector('[data-page]')).not.toBeNull();
        });
        expect(document.querySelector('[data-share-image]')).toBeNull();
        expect(window.printError).toBeUndefined();
    });

    it('draws the share picture for a share payload', async () => {
        await start(sharePayload);

        await waitFor(() => {
            expect(document.querySelector('[data-share-image]')).not.toBeNull();
        });
        expect(document.querySelector('[data-page]')).toBeNull();
    });

    it('reports the font error and draws nothing when the fonts fail', async () => {
        loadPrintFonts.mockRejectedValue(new Error('404'));

        await start(printPayload);

        await waitFor(() => {
            expect(window.printReady).toBe(true);
        });
        expect(window.printError).toBe('Fonts did not load: Error: 404');
        expect(document.getElementById('print-root')?.innerHTML).toBe('');
    });
});
