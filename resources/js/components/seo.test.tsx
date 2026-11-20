import type * as InertiaReact from '@inertiajs/react';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

import { Seo } from '@/components/seo';
import { fakePage } from '@/testing/page-props';

const page = vi.hoisted(() => ({ current: {} }));

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => page.current,
    Head: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

const seo = {
    canonical: 'https://printopoly.nl/en/print-guide',
    alternates: {
        nl: 'https://printopoly.nl/nl/printgids',
        en: 'https://printopoly.nl/en/print-guide',
        'x-default': 'https://printopoly.nl/nl/printgids',
    },
    ogImage: 'https://printopoly.nl/og/og-en.png',
    ogLocale: 'en_GB',
    alternateLocales: ['nl_NL'],
};

function withSeo(value: typeof seo | null) {
    const base = fakePage({ locale: 'en' });
    page.current = { ...base, props: { ...base.props, seo: value } };
}

function content(selector: string): string | null {
    return document.querySelector(selector)?.getAttribute('content') ?? null;
}

describe('Seo', () => {
    it('adds the canonical and an hreflang link per language, with x-default', () => {
        withSeo(seo);

        render(<Seo title="Print guide" description="What to order" />);

        expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
            'href',
            seo.canonical,
        );
        expect(document.querySelector('link[hreflang="nl"]')).toHaveAttribute(
            'href',
            'https://printopoly.nl/nl/printgids',
        );
        expect(
            document.querySelector('link[hreflang="x-default"]'),
        ).toHaveAttribute('href', 'https://printopoly.nl/nl/printgids');
    });

    it('fills the description, Open Graph and Twitter tags', () => {
        withSeo(seo);

        render(<Seo title="Print guide" description="What to order" />);

        expect(content('meta[name="description"]')).toBe('What to order');
        expect(content('meta[property="og:title"]')).toBe(
            'Print guide · Printopoly',
        );
        expect(content('meta[property="og:image"]')).toBe(seo.ogImage);
        expect(content('meta[property="og:locale"]')).toBe('en_GB');
        expect(content('meta[property="og:locale:alternate"]')).toBe('nl_NL');
        expect(content('meta[name="twitter:card"]')).toBe(
            'summary_large_image',
        );
        expect(content('meta[name="twitter:image"]')).toBe(seo.ogImage);
    });

    it('does not repeat the site name in a title that has it', () => {
        withSeo(seo);

        render(<Seo title="Printopoly: make an edition" description="x" />);

        expect(content('meta[property="og:title"]')).toBe(
            'Printopoly: make an edition',
        );
    });

    it('leaves out canonical and hreflang on a page without seo data', () => {
        withSeo(null);

        render(<Seo title="Editor" description="x" />);

        expect(
            document.querySelector('link[rel="canonical"]'),
        ).not.toBeInTheDocument();
        expect(
            document.querySelector('link[rel="alternate"]'),
        ).not.toBeInTheDocument();
        expect(
            document.querySelector('meta[property="og:image"]'),
        ).not.toBeInTheDocument();
    });
});
