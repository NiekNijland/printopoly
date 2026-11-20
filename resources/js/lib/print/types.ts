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

export function formatMm(value: number): string {
    return String(Math.round(value * 100) / 100).replace('.', ',');
}

export function rectsOverlap(a: Rect, b: Rect, eps = 1e-6): boolean {
    return a.x < b.x + b.w - eps && b.x < a.x + a.w - eps && a.y < b.y + b.h - eps && b.y < a.y + a.h - eps;
}

export function inflate(r: Rect, d: number): Rect {
    return { x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d };
}
