const INK = '#1B1F24';
const WHITE = '#FFFFFF';

/** Relative luminance (WCAG) of a `#RRGGBB` colour. */
export function luminance(hex: string): number {
    const value = hex.replace('#', '');
    const channel = (offset: number) => {
        const c = parseInt(value.slice(offset, offset + 2), 16) / 255;

        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };

    return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** Ink or white, whichever reads better on the given background. */
export function readableOn(background: string): string {
    return luminance(background) > 0.4 ? INK : WHITE;
}
