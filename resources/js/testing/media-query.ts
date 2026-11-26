/** A media query list whose answer stays the same, for a test that fixes what kind of screen it runs on. */
export const mediaQueryList = (
    media: string,
    matches: boolean,
): MediaQueryList =>
    Object.assign(new EventTarget(), {
        matches,
        media,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
    });
