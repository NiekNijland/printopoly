// The one door to matchMedia: where there is none (the server render, an old browser) a query has its fallback.
const hasMatchMedia = (): boolean =>
    typeof window !== 'undefined' && 'matchMedia' in window;

export const mediaMatches = (query: string, fallback = false): boolean =>
    hasMatchMedia() ? window.matchMedia(query).matches : fallback;

export const subscribeMedia = (
    query: string,
    onChange: () => void,
): (() => void) => {
    if (!hasMatchMedia()) {
        return () => undefined;
    }
    const list = window.matchMedia(query);
    list.addEventListener('change', onChange);

    return () => list.removeEventListener('change', onChange);
};
