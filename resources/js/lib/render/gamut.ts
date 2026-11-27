import { luminance, rgbOf } from './color';

const INK = '#1B1F24';
const WHITE = '#FFFFFF';

/** WCAG contrast ratio of two `#RRGGBB` colours, 1 to 21. */
export const contrastRatio = (a: string, b: string): number => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);

    return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
};

const toHex = (r: number, g: number, b: number): string => {
    const part = (c: number) =>
        Math.round(Math.min(255, Math.max(0, c)))
            .toString(16)
            .padStart(2, '0');

    return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
};

/** Hue (0 to 360), saturation and value (0 to 1) of a `#RRGGBB` colour. */
const hsv = (hex: string): { h: number; s: number; v: number } => {
    const [r, g, b] = rgbOf(hex, 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d > 0) {
        if (max === r) {
            h = ((g - b) / d) % 6;
        } else if (max === g) {
            h = (b - r) / d + 2;
        } else {
            h = (r - g) / d + 4;
        }
        h = (h * 60 + 360) % 360;
    }

    return { h, s: max === 0 ? 0 : d / max, v: max };
};

const fromHsv = (h: number, s: number, v: number): string => {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let channels: [number, number, number];
    if (h < 60) {
        channels = [c, x, 0];
    } else if (h < 120) {
        channels = [x, c, 0];
    } else if (h < 180) {
        channels = [0, c, x];
    } else if (h < 240) {
        channels = [0, x, c];
    } else if (h < 300) {
        channels = [x, 0, c];
    } else {
        channels = [c, 0, x];
    }

    return toHex(
        (channels[0] + m) * 255,
        (channels[1] + m) * 255,
        (channels[2] + m) * 255,
    );
};

/** The most vivid a green, cyan, blue or violet may be before an ordinary printer cannot reproduce it (B75). */
const MAX_VIVID_SATURATION = 0.85;
const MAX_VIVID_VALUE = 0.8;
/** Brightness above which a vivid cool colour counts as out of range. */
const VIVID_VALUE_TRIGGER = 0.9;

/**
 * Whether a colour sits outside what CMYK ink can print (B75): fully saturated and bright greens,
 * cyans, blues and violets turn dull on paper. Reds, oranges, yellows and magentas stay inside the range, so
 * the standard group colours pass.
 */
export const isOutOfGamut = (hex: string): boolean => {
    const { h, s, v } = hsv(hex);
    const warm = h < 65 || h >= 300;

    return !warm && s > MAX_VIVID_SATURATION && v > VIVID_VALUE_TRIGGER;
};

/** The nearest printable colour: vivid cool colours are toned down, others stay as they are. */
export const toPrintSafe = (hex: string): string => {
    if (!isOutOfGamut(hex)) {
        return hex.toUpperCase();
    }
    const { h, s, v } = hsv(hex);

    return fromHsv(
        h,
        Math.min(s, MAX_VIVID_SATURATION),
        Math.min(v, MAX_VIVID_VALUE),
    );
};

/** The ratio a bar needs against the board colour to stay visible. */
export const MIN_SHAPE_CONTRAST = 1.3;

/**
 * Ink or white, whichever has the higher contrast on the background. Unlike `readableOn` this never
 * picks the weaker one on a mid-tone, so text on a colour the user chose is always at least about 4 to 1.
 */
export const bestTextOn = (background: string): string => {
    return contrastRatio(INK, background) >= contrastRatio(WHITE, background)
        ? INK
        : WHITE;
};
