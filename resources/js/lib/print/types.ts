/** Shared geometry types. All units are millimetres, origin top-left, y grows downwards. */
export interface Size {
    w: number;
    h: number;
}

export interface Rect extends Size {
    x: number;
    y: number;
}

export interface Segment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

/** Element at `index`; throws instead of returning `undefined` (for `noUncheckedIndexedAccess`). */
export function at<T>(items: readonly T[], index: number): T {
    const item = items[index];
    if (item === undefined) {
        throw new RangeError(`No item at index ${String(index)}.`);
    }
    return item;
}

/** A size in mm with at most two decimals: "38,22" in Dutch, "38.22" in English (Lukas, R5-19). */
export function formatMm(value: number, locale: 'nl' | 'en' = 'nl'): string {
    const text = String(Math.round(value * 100) / 100);

    return locale === 'nl' ? text.replace('.', ',') : text;
}

export function rectsOverlap(a: Rect, b: Rect, eps = 1e-6): boolean {
    return (
        a.x < b.x + b.w - eps &&
        b.x < a.x + a.w - eps &&
        a.y < b.y + b.h - eps &&
        b.y < a.y + a.h - eps
    );
}

export function inflate(r: Rect, d: number): Rect {
    return { x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d };
}
