/**
 * Line work of a play money note (B137): a fine guilloche that we draw ourselves.
 * Everything is in mm, so the SVG stays sharp at any print resolution.
 */

export type Rect = {
    x: number;
    y: number;
    w: number;
    h: number;
};

/** How dense the line work is: Klassiek and Riso are busy, Strak has fewer lines. */
export type PatternDensity = 'full' | 'light';

const n = (value: number) => Number(value.toFixed(2));

const hexToHsl = (hex: string): [number, number, number] => {
    const value = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map(
        (offset) => parseInt(value.slice(offset, offset + 2), 16) / 255,
    ) as [number, number, number];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
        return [0, 0, l];
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h =
        max === r
            ? ((g - b) / d + (g < b ? 6 : 0)) * 60
            : max === g
              ? ((b - r) / d + 2) * 60
              : ((r - g) / d + 4) * 60;

    return [h, s, l];
};

const hslToHex = (h: number, s: number, l: number): string => {
    const a = s * Math.min(l, 1 - l);
    const f = (k: number) => {
        const m = (k + h / 30) % 12;
        const c = l - a * Math.max(-1, Math.min(m - 3, 9 - m, 1));

        return Math.round(c * 255)
            .toString(16)
            .padStart(2, '0');
    };

    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * The single ink of a note: a dark shade of the paper's own hue, like the original
 * money. Grey paper gets a neutral ink; anything that is not `#RRGGBB` gets the fallback.
 */
export const noteInk = (paper: string, fallback: string): string => {
    if (!HEX.test(paper)) {
        return fallback;
    }

    const [h, s] = hexToHsl(paper);

    if (s < 0.08) {
        return hslToHex(h, 0, 0.18);
    }

    return hslToHex(h, Math.min(0.55, Math.max(0.3, s * 0.6)), 0.22);
};

/** A light tint of the paper for the oval and the corner boxes, so the value reads. */
export const notePaperLight = (paper: string, fallback: string): string => {
    if (!HEX.test(paper)) {
        return fallback;
    }

    const [h, s, l] = hexToHsl(paper);

    return hslToHex(h, s, Math.min(0.96, l + (1 - l) * 0.55));
};

/** A circle as four cubic curves; arcs come out of Chrome's PDF as sixteen curves each. */
const circle = (cx: number, cy: number, r: number): string => {
    const k = r * 0.5523;

    return (
        `M${n(cx + r)} ${n(cy)}` +
        `C${n(cx + r)} ${n(cy + k)} ${n(cx + k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)}` +
        `C${n(cx - k)} ${n(cy + r)} ${n(cx - r)} ${n(cy + k)} ${n(cx - r)} ${n(cy)}` +
        `C${n(cx - r)} ${n(cy - k)} ${n(cx - k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)}` +
        `C${n(cx + k)} ${n(cy - r)} ${n(cx + r)} ${n(cy - k)} ${n(cx + r)} ${n(cy)}Z`
    );
};

/** Areas that cover the pattern (the oval, the strip): rings entirely inside them are left out. */
export type Cover = {
    ellipse?: { cx: number; cy: number; rx: number; ry: number };
    rects?: readonly Rect[];
};

const hidden = (cx: number, cy: number, r: number, cover: Cover): boolean => {
    const { ellipse, rects = [] } = cover;
    const inEllipse = (px: number, py: number) =>
        ellipse !== undefined &&
        ((px - ellipse.cx) / ellipse.rx) ** 2 +
            ((py - ellipse.cy) / ellipse.ry) ** 2 <=
            1;
    const inRect = (px: number, py: number) =>
        rects.some(
            (rect) =>
                px >= rect.x &&
                px <= rect.x + rect.w &&
                py >= rect.y &&
                py <= rect.y + rect.h,
        );
    const points = Array.from({ length: 12 }, (_, i): [number, number] => [
        cx + r * Math.cos((i / 12) * Math.PI * 2),
        cy + r * Math.sin((i / 12) * Math.PI * 2),
    ]);

    return (
        points.every(([px, py]) => inEllipse(px, py)) ||
        points.every(([px, py]) => inRect(px, py))
    );
};

/**
 * Overlapping groups of concentric rings on a staggered grid. Where the groups meet they
 * make the moire of the original note. Rings outside the field or under a cover are left
 * out, which keeps the PDF small: a money sheet holds hundreds of notes.
 */
export const ringField = (
    field: Rect,
    density: PatternDensity,
    cover: Cover = {},
): string => {
    const spacing = density === 'full' ? 14 : 18;
    const step = density === 'full' ? 0.9 : 1.5;
    const maxR = spacing * 0.62;
    const parts: string[] = [];
    const rowStep = spacing * 0.866;

    for (
        let row = 0;
        field.y + row * rowStep <= field.y + field.h + maxR;
        row++
    ) {
        const cy = field.y + row * rowStep;
        const offset = row % 2 === 0 ? 0 : spacing / 2;

        for (let col = 0; ; col++) {
            const cx = field.x - offset + col * spacing;

            if (cx > field.x + field.w + maxR) {
                break;
            }

            for (let r = step; r <= maxR; r += step) {
                if (!hidden(cx, cy, r, cover)) {
                    parts.push(circle(cx, cy, r));
                }
            }
        }
    }

    return parts.join('');
};

/**
 * A spirograph rosette (epitrochoid), stretched to an ellipse. `phase` turns the loops,
 * so two copies with different phases weave into each other.
 */
export const rosette = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    phase = 0,
    loops = 18,
): string => {
    const samples = loops * 16;
    const R = 1;
    const r = 1 / loops;
    const d = 0.55;
    const points: string[] = [];
    let maxRadius = 0;
    const raw: [number, number][] = [];

    for (let i = 0; i <= samples; i++) {
        const t = (i / samples) * Math.PI * 2;
        const x =
            (R + r) * Math.cos(t + phase) -
            d * Math.cos(((R + r) / r) * t + phase);
        const y =
            (R + r) * Math.sin(t + phase) -
            d * Math.sin(((R + r) / r) * t + phase);
        raw.push([x, y]);
        maxRadius = Math.max(maxRadius, Math.hypot(x, y));
    }

    for (const [x, y] of raw) {
        points.push(
            `${n(cx + (x / maxRadius) * rx)} ${n(cy + (y / maxRadius) * ry)}`,
        );
    }

    return `M${points.join('L')}Z`;
};

/** Small half circles all round the band between the two frames, like the edge of a banknote. */
export const scallopBand = (rect: Rect, radius: number): string => {
    const parts: string[] = [];
    const along = (
        x0: number,
        y0: number,
        length: number,
        dx: number,
        dy: number,
    ) => {
        const count = Math.floor(length / (radius * 2));
        const size = length / count;

        for (let i = 0; i < count; i++) {
            const sx = x0 + dx * i * size;
            const sy = y0 + dy * i * size;
            const ex = sx + dx * size;
            const ey = sy + dy * size;
            parts.push(
                `M${n(sx)} ${n(sy)}A${n(size / 2)} ${n(size / 2)} 0 0 1 ${n(ex)} ${n(ey)}`,
            );
        }
    };

    along(rect.x, rect.y, rect.w, 1, 0);
    along(rect.x + rect.w, rect.y, rect.h, 0, 1);
    along(rect.x + rect.w, rect.y + rect.h, rect.w, -1, 0);
    along(rect.x, rect.y + rect.h, rect.h, 0, -1);

    return parts.join('');
};

/** Diagonal hatching inside a rectangle, for the side panels of the corner boxes. */
export const hatch = (rect: Rect, gap: number): string => {
    const parts: string[] = [];

    for (let s = gap; s < rect.w + rect.h; s += gap) {
        const x1 = rect.x + Math.min(s, rect.w);
        const y1 = rect.y + Math.max(0, s - rect.w);
        const x2 = rect.x + Math.max(0, s - rect.h);
        const y2 = rect.y + Math.min(s, rect.h);
        parts.push(`M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`);
    }

    return parts.join('');
};

const cache = new Map<string, string>();

/** Memoises line work: it depends on geometry only, and a print sheet has hundreds of notes. */
export const cached = (key: string, build: () => string): string => {
    const hit = cache.get(key);

    if (hit !== undefined) {
        return hit;
    }

    const value = build();
    cache.set(key, value);

    return value;
};

export type NoteIconName = 'house' | 'hotel' | 'key' | 'die';

const ICON_ORDER: readonly NoteIconName[] = ['house', 'hotel', 'key', 'die'];

/** The two corner icons of a note: a different pair per value, always the same for one value. */
export const noteIcons = (value: number): [NoteIconName, NoteIconName] => {
    const values = [1, 5, 10, 20, 50, 100, 500];
    const index = Math.max(0, values.indexOf(value));
    const first = ICON_ORDER[index % 4] as NoteIconName;
    const second = ICON_ORDER[(index + 2) % 4] as NoteIconName;

    return [first, second];
};

/** Line work drawn onto one picture: what goes in it, in mm on the note. */
export type PatternRaster = {
    /** Size of the note in mm. */
    w: number;
    h: number;
    /** Paths clipped to `clip`, each with its colour. */
    clipped: readonly { d: string; color: string }[];
    clip: Rect;
    /** Paths drawn without a clip; `dash` with round caps draws a row of dots (beads, polka dots, B270). */
    free: readonly {
        d: string;
        color: string;
        widthMm: number;
        dash?: readonly number[];
    }[];
    lineMm: number;
    /** The paper under the lines; null keeps the picture transparent (a photo shows through). */
    background: string | null;
    /** Pixels per mm. */
    density: number;
};

const rasters = new Map<string, string | null>();

/**
 * The guilloche of a note as one PNG (bug 3 of test round 4). Chrome writes vector line work into the PDF once per
 * note, so a sheet of money weighed more than a megabyte. A picture that is the same for every note of a value is
 * stored once per PDF: Chrome reuses an image it has already written. Returns null where there is no canvas (tests,
 * the server), so the caller keeps the vector lines.
 */
export const rasterPattern = (
    key: string,
    raster: PatternRaster,
): string | null => {
    const hit = rasters.get(key);

    if (hit !== undefined) {
        return hit;
    }

    const url = drawPattern(raster);
    rasters.set(key, url);

    return url;
};

const drawPattern = (raster: PatternRaster): string | null => {
    if (typeof document === 'undefined' || typeof Path2D === 'undefined') {
        return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(raster.w * raster.density);
    canvas.height = Math.round(raster.h * raster.density);

    let context: CanvasRenderingContext2D | null = null;

    try {
        context = canvas.getContext('2d');
    } catch {
        return null;
    }

    if (context === null) {
        return null;
    }

    context.scale(canvas.width / raster.w, canvas.height / raster.h);

    if (raster.background !== null) {
        context.fillStyle = raster.background;
        context.fillRect(0, 0, raster.w, raster.h);
    }

    context.save();
    context.beginPath();
    context.rect(raster.clip.x, raster.clip.y, raster.clip.w, raster.clip.h);
    context.clip();
    context.lineWidth = raster.lineMm;

    for (const { d, color } of raster.clipped) {
        context.strokeStyle = color;
        context.stroke(new Path2D(d));
    }

    context.restore();

    for (const { d, color, widthMm, dash } of raster.free) {
        context.strokeStyle = color;
        context.lineWidth = widthMm;
        if (dash !== undefined) {
            context.setLineDash([...dash]);
            context.lineCap = 'round';
        }
        context.stroke(new Path2D(d));
        if (dash !== undefined) {
            context.setLineDash([]);
            context.lineCap = 'butt';
        }
    }

    try {
        const url = canvas.toDataURL('image/png');

        return url.startsWith('data:image/png') ? url : null;
    } catch {
        return null;
    }
};
