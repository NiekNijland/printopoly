import { screen } from '@testing-library/react';

import { fakePage, type FakePage } from '@/testing/page-props';

const initialPage = ({ url, props }: FakePage) => ({
    component: 'placeholder',
    props: { ...props, titleKey: 'nav.print_guide' },
    url,
    version: null,
    clearHistory: false,
    encryptHistory: false,
});

const start = async (page: FakePage): Promise<void> => {
    document.body.innerHTML = `<script data-page="app" type="application/json">${JSON.stringify(initialPage(page))}</script><div id="app"></div>`;
    vi.resetModules();
    await import('./app');
};

describe('the browser entry', () => {
    beforeEach(() => {
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', false);
    });

    it('mounts the page of the initial Inertia page in its layout', async () => {
        await start(fakePage());

        expect(
            await screen.findByRole('heading', { name: 'Printgids' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Naar de inhoud' }),
        ).toBeInTheDocument();
    });

    it('loads the catalogue of the language in the URL', async () => {
        await start(fakePage({ locale: 'en' }));

        expect(
            await screen.findByRole('heading', { name: 'Print guide' }),
        ).toBeInTheDocument();
    });
});
