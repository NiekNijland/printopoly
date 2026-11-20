import type { ResolvedComponent } from '@inertiajs/react';

/** "Mijn edities" → "Mijn edities · Printopoly"; no title → "Printopoly". */
export function documentTitle(title: string): string {
    return title === '' ? 'Printopoly' : `${title} · Printopoly`;
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
