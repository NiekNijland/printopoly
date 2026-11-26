import { render } from '@testing-library/react';

import { Seo } from '@/components/seo';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';

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
    ogImageWidth: 1200,
    ogImageHeight: 630,
    jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [{ '@type': 'WebSite', name: 'a</b>' }],
    },
};

const withSeo = (value: typeof seo | null) => {
    const base = fakePage({ locale: 'en' });
    setPage({ ...base, props: { ...base.props, seo: value } });
};

const content = (selector: string): string | null => {
    return document.querySelector(selector)?.getAttribute('content') ?? null;
};

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

    it('adds the image size, robots and JSON-LD, without a way out of the script tag', () => {
        withSeo(seo);

        render(<Seo title="Print guide" description="What to order" />);

        expect(content('meta[property="og:image:width"]')).toBe('1200');
        expect(content('meta[property="og:image:height"]')).toBe('630');
        expect(content('meta[name="robots"]')).toContain('index, follow');

        const json = document.querySelector(
            'script[type="application/ld+json"]',
        )?.innerHTML;

        expect(json).not.toContain('</b>');
        const parsed = JSON.parse(json ?? '{}') as {
            '@graph': { name: string }[];
        };

        expect(parsed['@graph'][0]?.name).toBe('a</b>');
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
