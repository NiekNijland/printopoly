import type { ResolvedComponent } from '@inertiajs/react';

import { documentTitle, resolvePage } from '@/lib/pages';

describe('documentTitle', () => {
    it('adds the site name after the page title', () => {
        expect(documentTitle('Mijn edities')).toBe('Mijn edities · Printopoly');
    });

    it('keeps a title that already holds the site name', () => {
        expect(documentTitle('Printopoly: maak je eigen editie')).toBe(
            'Printopoly: maak je eigen editie',
        );
    });

    it('is just the site name without a page title', () => {
        expect(documentTitle('')).toBe('Printopoly');
    });
});

describe('resolvePage', () => {
    const Home: ResolvedComponent = () => null;
    const pages = { './pages/home.tsx': () => Promise.resolve(Home) };

    it('loads a page by its Inertia name', async () => {
        await expect(resolvePage(pages, 'home')).resolves.toBe(Home);
    });

    it('throws for a page that does not exist', () => {
        expect(() => resolvePage(pages, 'missing')).toThrow(
            'Page not found: missing',
        );
    });
});
