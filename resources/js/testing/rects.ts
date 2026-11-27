import type { Rect } from '@/types/print';

export const rectsOverlap = (a: Rect, b: Rect, eps = 1e-6): boolean =>
    a.x < b.x + b.w - eps &&
    b.x < a.x + a.w - eps &&
    a.y < b.y + b.h - eps &&
    b.y < a.y + a.h - eps;
