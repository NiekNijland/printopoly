// @vitest-environment node
import type { Page } from '@inertiajs/core';

import { ssrRender } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';

import './ssr';

const page = (locale: 'nl' | 'en'): Page => {
    const { url, props } = fakePage({ locale });

    return {
        component: 'placeholder',
        props: { ...props, errors: {}, titleKey: 'nav.print_guide' },
        url,
        version: null,
        clearHistory: false,
        encryptHistory: false,
        rememberedState: {},
        rescuedProps: [],
        flash: {},
    };
};

const render = async (locale: 'nl' | 'en') => {
    const response = await ssrRender()(page(locale));
    if (response === undefined) {
        throw new Error('The SSR entry rendered nothing.');
    }

    return response;
};

describe('the SSR entry', () => {
    beforeEach(() => {
        vi.stubGlobal('__SSR_RELEASE_ID__', 'release-7');
    });

    it('renders the page in its layout, in the language of the page', async () => {
        const dutch = await render('nl');
        const english = await render('en');

        expect(dutch.body).toContain('Printgids</h1>');
        expect(dutch.body).toContain('Naar de inhoud');
        expect(english.body).toContain('Print guide</h1>');
    });

    it('sends the release it was built with along with the answer', async () => {
        const response = await render('nl');

        expect(response).toMatchObject({ release: 'release-7' });
    });
});
