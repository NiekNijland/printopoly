/** Megabytes with one decimal, with a comma in Dutch. */
export const formatMegabytes = (bytes: number, locale: string): string => {
    const text = Math.max(0.1, bytes / 1048576).toFixed(1);

    return locale === 'nl' ? text.replace('.', ',') : text;
};

/** A size in whole mm, or with one decimal (a comma in Dutch). */
export const formatMm = (value: number, locale: string): string => {
    const rounded = Math.round(value * 10) / 10;

    return locale === 'nl'
        ? String(rounded).replace('.', ',')
        : String(rounded);
};

/** A size in whole centimetres, such as "50 × 50 cm" for the whole board (B243). */
export const formatCm = (valueMm: number, locale: string): string => {
    const cm = formatMm(Math.round(valueMm / 10), locale);

    return `${cm} × ${cm} cm`;
};
