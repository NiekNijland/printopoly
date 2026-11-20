import type { ResolvedComponent } from '@inertiajs/react';

/**
 * "Mijn edities" → "Mijn edities · Printopoly"; no title → "Printopoly". A
 * title that already names the site ("Printopoly: maak je eigen editie")
 * stays as it is.
 */
export function documentTitle(title: string): string {
    if (title === '') {
        return 'Printopoly';
    }

    return title.includes('Printopoly') ? title : `${title} · Printopoly`;
}

/** Resolve an Inertia page name from a Vite glob of ./pages. */
export function resolvePage(
    pages: Record<string, () => Promise<ResolvedComponent>>,
    name: string,
): Promise<ResolvedComponent> {
    const page = pages[`./pages/${name}.tsx`];

    if (!page) {
        throw new Error(`Page not found: ${name}`);
    }

    return page();
}
