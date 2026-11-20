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

/** Mixes two `#RRGGBB` colours; `amount` is the share of `b` (0 to 1). */
export function mix(a: string, b: string, amount: number): string {
    const channel = (hex: string, offset: number) =>
        parseInt(hex.replace('#', '').slice(offset, offset + 2), 16);
    const part = (offset: number) =>
        Math.round(
            channel(a, offset) * (1 - amount) + channel(b, offset) * amount,
        )
            .toString(16)
            .padStart(2, '0');

    return `#${part(0)}${part(2)}${part(4)}`.toUpperCase();
}

/** A `#RRGGBB` colour as `rgba()` with the given opacity (0 to 1), for bands over photos. */
export function withAlpha(hex: string, alpha: number): string {
    const value = hex.replace('#', '');
    const channel = (offset: number) =>
        parseInt(value.slice(offset, offset + 2), 16);

    return `rgba(${channel(0)}, ${channel(2)}, ${channel(4)}, ${alpha})`;
}
