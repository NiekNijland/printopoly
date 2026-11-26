import type { Locale } from '@/types/game';

/** A colour in words: its name, and in Dutch the form before a plural noun ("paarse straten"). */
export type ColorName = {
    name: string;
    /** "paarse" in "de paarse straten"; the same as `name` in English. */
    before: string;
};

type NamedColor = {
    hex: string;
    nl: ColorName;
    en: string;
};

/**
 * The colours a group can be called by. The first eight are the standard group colours, so a group in its standard
 * colour keeps its standard name; the rest are the colours a theme or a person is likely to pick.
 */
const NAMED: readonly NamedColor[] = [
    { hex: '#955436', nl: { name: 'bruin', before: 'bruine' }, en: 'brown' },
    {
        hex: '#AAE0FA',
        nl: { name: 'lichtblauw', before: 'lichtblauwe' },
        en: 'light blue',
    },
    { hex: '#D93A96', nl: { name: 'roze', before: 'roze' }, en: 'pink' },
    { hex: '#F7941D', nl: { name: 'oranje', before: 'oranje' }, en: 'orange' },
    { hex: '#ED1B24', nl: { name: 'rood', before: 'rode' }, en: 'red' },
    { hex: '#FEF200', nl: { name: 'geel', before: 'gele' }, en: 'yellow' },
    { hex: '#1FB25A', nl: { name: 'groen', before: 'groene' }, en: 'green' },
    {
        hex: '#0072BB',
        nl: { name: 'donkerblauw', before: 'donkerblauwe' },
        en: 'dark blue',
    },
    { hex: '#8E44AD', nl: { name: 'paars', before: 'paarse' }, en: 'purple' },
    { hex: '#C8A2E0', nl: { name: 'lila', before: 'lila' }, en: 'lilac' },
    {
        hex: '#00B2C9',
        nl: { name: 'turquoise', before: 'turquoise' },
        en: 'turquoise',
    },
    {
        hex: '#1E6B3A',
        nl: { name: 'donkergroen', before: 'donkergroene' },
        en: 'dark green',
    },
    {
        hex: '#1F2D5C',
        nl: { name: 'marineblauw', before: 'marineblauwe' },
        en: 'navy',
    },
    {
        hex: '#7B1E30',
        nl: { name: 'bordeauxrood', before: 'bordeauxrode' },
        en: 'burgundy',
    },
    { hex: '#D9C7A0', nl: { name: 'beige', before: 'beige' }, en: 'beige' },
    { hex: '#8C8C8C', nl: { name: 'grijs', before: 'grijze' }, en: 'grey' },
    { hex: '#1B1F24', nl: { name: 'zwart', before: 'zwarte' }, en: 'black' },
    { hex: '#FAFAF7', nl: { name: 'wit', before: 'witte' }, en: 'white' },
];

const channels = (hex: string): [number, number, number] => {
    const value = hex.replace('#', '');

    return [0, 2, 4].map(
        (offset) => parseInt(value.slice(offset, offset + 2), 16) / 255,
    ) as [number, number, number];
};

/** CIE Lab of a `#RRGGBB` colour (D65), so "nearest" is what the eye calls nearest. */
const lab = (hex: string): [number, number, number] => {
    const [r, g, b] = channels(hex).map((c) =>
        c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    ) as [number, number, number];
    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    const f = (t: number) =>
        t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const [fx, fy, fz] = [f(x), f(y), f(z)];

    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const distance = (a: string, b: string): number => {
    const [l1, a1, b1] = lab(a);
    const [l2, a2, b2] = lab(b);

    return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

/** The name of the nearest named colour, in the language asked for: `#9A4E8E` is "paars" (bug 27). */
export const colorName = (hex: string, locale: Locale): ColorName => {
    const valid = /^#[0-9a-f]{6}$/i.test(hex);
    const nearest =
        (valid
            ? NAMED.reduce((best, candidate) =>
                  distance(hex, candidate.hex) < distance(hex, best.hex)
                      ? candidate
                      : best,
              )
            : undefined) ?? NAMED[0];

    if (nearest === undefined) {
        return { name: hex, before: hex };
    }

    return locale === 'nl'
        ? nearest.nl
        : { name: nearest.en, before: nearest.en };
};
