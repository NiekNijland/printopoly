/**
 * Corners are drawn in one upright frame, the frame of Start: the inner point (the one that touches the middle of
 * the board) is top left, the outer edges are the bottom and the right. Their content runs on the 45° diagonal and
 * reads from the outer corner towards the middle. The board turns each corner by a quarter turn per side, the same
 * way it turns the spaces next to it, so every corner faces its own edge (Niek, feedback 22 nov).
 */
export const CORNER_TEXT_ANGLE = -45;

/** Quarter turns (in degrees, clockwise) that put an upright corner in its place on the board. */
export const cornerRotation = (position: number): 0 | 90 | 180 | 270 => {
    switch (position) {
        case 10:
            return 90;
        case 20:
            return 180;
        case 30:
            return 270;
        default:
            return 0;
    }
};

export type Bounds = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

/**
 * The widest band on the diagonal that stays inside `bounds`. The band is centred on `centre`, lies `offset` mm
 * along the reading "up" (towards the inner point for the corner angle) and is `height` mm high. Returns the
 * width in mm (0 when nothing fits).
 */
export const diagonalBandWidth = (
    bounds: Bounds,
    centre: { x: number; y: number },
    offset: number,
    height: number,
    angle: number = CORNER_TEXT_ANGLE,
): number => {
    const rad = (angle * Math.PI) / 180;
    const up = { x: Math.sin(rad), y: -Math.cos(rad) };
    const along = { x: Math.cos(rad), y: Math.sin(rad) };
    let half = Infinity;

    for (const w of [offset - height / 2, offset + height / 2]) {
        const px = centre.x + w * up.x;
        const py = centre.y + w * up.y;

        for (const [p, e, min, max] of [
            [px, along.x, bounds.left, bounds.right],
            [py, along.y, bounds.top, bounds.bottom],
        ] as const) {
            if (Math.abs(e) < 1e-9) {
                if (p < min || p > max) {
                    return 0;
                }
                continue;
            }
            // One end of the band moves towards max, the other towards min.
            half = Math.min(
                half,
                (max - p) / Math.abs(e),
                (p - min) / Math.abs(e),
            );
        }
    }

    return Math.max(0, 2 * half);
};

/**
 * Splits a name into two lines of about the same length at a space, for the corners that put the name above and
 * below their picture ("Ga naar de" / "gevangenis", "Vrij" / "parkeren"). A name without a space stays whole.
 */
export const splitBalanced = (text: string): [string, string] => {
    const words = text.trim().split(/\s+/).filter(Boolean);

    if (words.length < 2) {
        return [words.join(' '), ''];
    }

    let best: [string, string] = [words.join(' '), ''];
    let score = Infinity;

    for (let i = 1; i < words.length; i++) {
        const first = words.slice(0, i).join(' ');
        const second = words.slice(i).join(' ');
        // A slightly longer second line looks better under a picture than a longer first line.
        const candidate =
            Math.max(first.length, second.length) +
            (first.length > second.length ? 0.5 : 0);

        if (candidate < score) {
            score = candidate;
            best = [first, second];
        }
    }

    return best;
};

/**
 * The jail corner has one name for two things, as in the standard "Gevangenis (op bezoek)": the place, which goes
 * on the cell, and what is between brackets, which runs as an L along the two outer edges. A name without
 * brackets is all place, and the edges get the standard "Op bezoek".
 */
export const jailNameParts = (
    name: string,
    standardVisiting: string,
): { place: string; visiting: string } => {
    const match = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(name.trim());

    if (match === null) {
        return { place: name.trim(), visiting: standardVisiting };
    }

    const visiting = (match[2] ?? '').trim();

    return {
        place: (match[1] ?? '').trim(),
        visiting:
            visiting === ''
                ? standardVisiting
                : visiting.charAt(0).toLocaleUpperCase() + visiting.slice(1),
    };
};

/** The visiting words split over the two edges: the first word on the first edge, the rest on the second. */
export const visitingLegs = (visiting: string): [string, string] => {
    const words = visiting.trim().split(/\s+/).filter(Boolean);

    if (words.length < 2) {
        return ['', words.join(' ')];
    }

    return [words[0] ?? '', words.slice(1).join(' ')];
};
