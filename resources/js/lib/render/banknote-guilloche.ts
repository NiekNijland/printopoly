import type { Rect } from './banknote-pattern';

/**
 * The engraved line work of a Vintage note (B270): lathe rosettes, a woven net of waves and a twisted rope round the
 * border, all generated here as SVG paths in mm. Nothing is copied from a real note: these are the textbook curves
 * of a guilloche lathe, tuned for a 130 x 60 mm note. On a print sheet the note draws them once per value as one
 * picture (`rasterPattern`), so the size of these paths never reaches the PDF note by note.
 */

const n = (value: number) => Number(value.toFixed(2));

const polyline = (points: readonly (readonly [number, number])[]): string => {
    return `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}`;
};

export type LatheRosette = {
    cx: number;
    cy: number;
    /** Radius of the innermost ring, in mm along y. */
    inner: number;
    /** Radius of the outermost ring, in mm along y. */
    outer: number;
    rings: number;
    /** Waves round one ring. */
    lobes: number;
    /** Height of the waves, in mm. */
    amp: number;
    /** How far each ring turns its waves against the one inside it, in radians: this makes the weave. */
    twist: number;
    /** Stretch along x: 1 is round, more is an ellipse. */
    stretch?: number;
};

/**
 * Concentric wavy rings: r(θ) = base + amp · sin(lobes · θ + k · twist). Turning every ring a little against the
 * one inside it gives the woven flower of a banknote rosette.
 */
export const latheRosette = ({
    cx,
    cy,
    inner,
    outer,
    rings,
    lobes,
    amp,
    twist,
    stretch = 1,
}: LatheRosette): string => {
    const samples = Math.max(48, lobes * 8);
    const parts: string[] = [];

    for (let k = 0; k < rings; k++) {
        const base =
            rings === 1 ? inner : inner + ((outer - inner) * k) / (rings - 1);
        const points: [number, number][] = [];

        for (let i = 0; i < samples; i++) {
            const theta = (i / samples) * Math.PI * 2;
            const r = base + amp * Math.sin(lobes * theta + k * twist);
            points.push([
                cx + r * Math.cos(theta) * stretch,
                cy + r * Math.sin(theta),
            ]);
        }

        parts.push(`${polyline(points)}Z`);
    }

    return parts.join('');
};

/**
 * Two families of waves across a field, half a wave apart, so they cross into a net of small lenses. The waves
 * swell and shrink along the note, which gives the slow moiré of engraved paper.
 */
export const waveNet = (
    field: Rect,
    { gap, amp, period }: { gap: number; amp: number; period: number },
    /** Areas a filled shape covers (the oval, the cartouches): the waves stop there, which keeps the picture light. */
    hidden: (x: number, y: number) => boolean = () => false,
): string => {
    const parts: string[] = [];
    const step = period / 9;

    for (const phase of [0, Math.PI]) {
        for (let y0 = field.y - amp; y0 <= field.y + field.h + amp; y0 += gap) {
            const points: [number, number][] = [];

            for (
                let x = field.x;
                x <= field.x + field.w + step / 2;
                x += step
            ) {
                const swell =
                    0.55 +
                    0.45 * Math.cos(((x - field.x) / field.w) * Math.PI * 4);
                const y =
                    y0 +
                    amp *
                        swell *
                        Math.sin(
                            ((x - field.x) / period) * Math.PI * 2 + phase,
                        );
                if (hidden(x, y)) {
                    if (points.length > 1) {
                        parts.push(polyline(points));
                    }
                    points.length = 0;
                } else {
                    points.push([x, y]);
                }
            }

            if (points.length > 1) {
                parts.push(polyline(points));
            }
        }
    }

    return parts.join('');
};

/**
 * A twisted rope along the four sides of a band: `strands` waves round the centre line of the band, each a little
 * further on, so they wind round each other. Each side stops `corner` mm from the corner, where a corner block sits.
 */
export const ropeBand = (
    rect: Rect,
    {
        amp,
        period,
        strands,
        corner,
    }: { amp: number; period: number; strands: number; corner: number },
): string => {
    const parts: string[] = [];
    const sides: [number, number, number, number][] = [
        [rect.x, rect.y, rect.x + rect.w, rect.y],
        [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
        [rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h],
        [rect.x, rect.y + rect.h, rect.x, rect.y],
    ];

    for (const [x1, y1, x2, y2] of sides) {
        const length = Math.hypot(x2 - x1, y2 - y1);
        const ux = (x2 - x1) / length;
        const uy = (y2 - y1) / length;
        const usable = length - 2 * corner;
        // A whole number of waves, so both ends of a side look the same.
        const waves = Math.max(1, Math.round(usable / period));
        const wave = usable / waves;
        const step = wave / 7;

        for (let s = 0; s < strands; s++) {
            const phase = (s / strands) * Math.PI * 2;
            const points: [number, number][] = [];

            for (let t = 0; t <= usable + step / 2; t += step) {
                const offset = amp * Math.sin((t / wave) * Math.PI * 2 + phase);
                const along = corner + t;
                points.push([
                    x1 + ux * along - uy * offset,
                    y1 + uy * along + ux * offset,
                ]);
            }

            parts.push(polyline(points));
        }
    }

    return parts.join('');
};

/** Square blocks in the four corners of a band, each with a small rosette, where the rope turns. */
export const cornerBlocks = (rect: Rect, size: number): string => {
    const half = size / 2;
    const corners: [number, number][] = [
        [rect.x, rect.y],
        [rect.x + rect.w, rect.y],
        [rect.x + rect.w, rect.y + rect.h],
        [rect.x, rect.y + rect.h],
    ];

    return corners
        .map(
            ([cx, cy]) =>
                `M${n(cx - half)} ${n(cy - half)}h${n(size)}v${n(size)}h${n(-size)}Z` +
                latheRosette({
                    cx,
                    cy,
                    inner: half * 0.25,
                    outer: half * 0.72,
                    rings: 4,
                    lobes: 8,
                    amp: half * 0.1,
                    twist: 0.5,
                }),
        )
        .join('');
};

/** A box with its corners cut off at 45°, the cartouche of an engraved note. */
export const cutCornerBox = (rect: Rect, cut: number): string => {
    const { x, y, w, h } = rect;

    return (
        `M${n(x + cut)} ${n(y)}H${n(x + w - cut)}L${n(x + w)} ${n(y + cut)}V${n(y + h - cut)}` +
        `L${n(x + w - cut)} ${n(y + h)}H${n(x + cut)}L${n(x)} ${n(y + h - cut)}V${n(y + cut)}Z`
    );
};

/** A banner with notched ends: a box whose short sides fold in to a point. */
export const notchedBanner = (rect: Rect, notch: number): string => {
    const { x, y, w, h } = rect;
    const mid = y + h / 2;

    return (
        `M${n(x)} ${n(y)}H${n(x + w)}L${n(x + w - notch)} ${n(mid)}L${n(x + w)} ${n(y + h)}` +
        `H${n(x)}L${n(x + notch)} ${n(mid)}Z`
    );
};

/** An ellipse as four cubic curves (Chrome writes an SVG arc into the PDF as many more). */
export const ellipsePath = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
): string => {
    const kx = rx * 0.5523;
    const ky = ry * 0.5523;

    return (
        `M${n(cx + rx)} ${n(cy)}` +
        `C${n(cx + rx)} ${n(cy + ky)} ${n(cx + kx)} ${n(cy + ry)} ${n(cx)} ${n(cy + ry)}` +
        `C${n(cx - kx)} ${n(cy + ry)} ${n(cx - rx)} ${n(cy + ky)} ${n(cx - rx)} ${n(cy)}` +
        `C${n(cx - rx)} ${n(cy - ky)} ${n(cx - kx)} ${n(cy - ry)} ${n(cx)} ${n(cy - ry)}` +
        `C${n(cx + kx)} ${n(cy - ry)} ${n(cx + rx)} ${n(cy - ky)} ${n(cx + rx)} ${n(cy)}Z`
    );
};

/** A wavy circle, the badge of a Speels note: `bumps` round bumps on a circle of radius `r`. */
export const bumpyCircle = (
    cx: number,
    cy: number,
    r: number,
    bumps: number,
    depth: number,
): string => {
    const parts: string[] = [];
    const step = (Math.PI * 2) / bumps;

    for (let i = 0; i < bumps; i++) {
        const a0 = i * step;
        const a1 = a0 + step;
        const mid = a0 + step / 2;
        const outer = r + depth;
        const x0 = cx + r * Math.cos(a0);
        const y0 = cy + r * Math.sin(a0);
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        // One quadratic curve per bump, through a point beyond the circle.
        const qx = cx + (outer + depth) * Math.cos(mid);
        const qy = cy + (outer + depth) * Math.sin(mid);
        parts.push(
            `${i === 0 ? `M${n(x0)} ${n(y0)}` : ''}Q${n(qx)} ${n(qy)} ${n(x1)} ${n(y1)}`,
        );
    }

    return `${parts.join('')}Z`;
};
