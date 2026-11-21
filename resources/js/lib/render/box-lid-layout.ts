import type { Rect, Size } from '@/lib/print/types';

/** How the photo sits on the lid: none, in a frame above the title, or over the whole lid (B124). */
export type LidPhoto = 'none' | 'framed' | 'full';

export interface LidLayoutInput {
    photo: LidPhoto;
    /** Where the title sits on a photo over the whole lid, -1 (top) to 1 (bottom); 0 is the standard place (B170). */
    offset?: number;
    /** Whether there is a line under the title (the standard "Een spel voor 2 tot 8 spelers" or an own one). */
    subtitle: boolean;
    /** Whether there are own lines under the subtitle (B169). */
    lines: boolean;
}

/** Where the fixed text of the box lid goes, in mm from the top left of the lid. */
export interface LidLayout {
    /** The photo frame; `undefined` without a photo, the whole lid (plus bleed) for a full photo. */
    photo: Rect | undefined;
    /** The block behind the text on a full photo: the band, or the fade when the band is off. */
    block: Rect | undefined;
    title: Rect;
    subtitle: Rect | undefined;
    lines: Rect | undefined;
    /** The four small icons of a lid without a photo. */
    icons: Rect | undefined;
}

const MARGIN = 12;

/**
 * The places of the title, the subtitle and the own lines on the box lid. The renderer and the Controle use the
 * same numbers, so a free layer that covers the fixed text is found (bug 36 of ronde 3).
 */
export function lidLayout(size: Size, input: LidLayoutInput): LidLayout {
    const { w, h } = size;
    const inner = w - 2 * MARGIN;
    const linesHeight = input.lines ? Math.min(28, h * 0.11) : 0;

    if (input.photo === 'full') {
        const titleHeight = h * 0.28 * 0.62;
        const subtitleHeight = input.subtitle ? h * 0.05 : 0;
        const blockHeight =
            4 + titleHeight + 1 + subtitleHeight + linesHeight + 4;
        const standard = h * 0.58;
        const top = MARGIN + 2;
        const bottom = h - MARGIN - 2 - blockHeight;
        const offset = Math.min(1, Math.max(-1, input.offset ?? 0));
        const blockTop = Math.min(
            bottom,
            offset < 0
                ? standard + (top - standard) * -offset
                : standard + (bottom - standard) * offset,
        );
        const titleTop = blockTop + 4;
        const subtitleTop = titleTop + titleHeight + 1;
        const linesTop = subtitleTop + subtitleHeight;

        return {
            photo: { x: 0, y: 0, w, h },
            block: { x: 0, y: blockTop, w, h: blockHeight },
            title: { x: MARGIN, y: titleTop, w: inner, h: titleHeight },
            subtitle: input.subtitle
                ? { x: MARGIN, y: subtitleTop, w: inner, h: subtitleHeight }
                : undefined,
            lines: input.lines
                ? { x: MARGIN, y: linesTop, w: inner, h: linesHeight }
                : undefined,
            icons: undefined,
        };
    }

    const framed = input.photo === 'framed';
    // With own lines the photo gives up a little height, so everything stays inside the frame.
    const photoHeight = h * 0.58 - (framed ? linesHeight : 0);
    const titleTop = framed ? 10 + photoHeight + 6 : h * 0.26;
    const titleHeight = framed ? h * 0.2 : h * 0.26;
    const subtitleTop = titleTop + titleHeight + 2;
    const subtitleHeight = input.subtitle ? 9 : 0;
    const linesTop = subtitleTop + subtitleHeight + 2;
    const iconsTop = h * 0.72 + (input.lines ? linesHeight * 0.6 : 0);

    return {
        photo: framed
            ? { x: MARGIN, y: MARGIN, w: inner, h: photoHeight }
            : undefined,
        block: undefined,
        title: { x: MARGIN, y: titleTop, w: inner, h: titleHeight },
        subtitle: input.subtitle
            ? { x: MARGIN, y: subtitleTop, w: inner, h: subtitleHeight }
            : undefined,
        lines: input.lines
            ? { x: MARGIN, y: linesTop, w: inner, h: linesHeight }
            : undefined,
        icons: framed
            ? undefined
            : { x: w / 2 - 54, y: iconsTop, w: 108, h: 26 },
    };
}

/** The areas of fixed text on the lid, for the red zone in the editor and the Controle (bug 36). */
export function lidTextZones(layout: LidLayout): Rect[] {
    return [layout.title, layout.subtitle, layout.lines].filter(
        (rect): rect is Rect => rect !== undefined,
    );
}

/** The box around a free layer, turned by its rotation, in mm. */
function boundsOf(layer: Rect & { rotation?: number }): Rect {
    const turn = ((layer.rotation ?? 0) * Math.PI) / 180;
    const cos = Math.abs(Math.cos(turn));
    const sin = Math.abs(Math.sin(turn));
    const w = layer.w * cos + layer.h * sin;
    const h = layer.w * sin + layer.h * cos;

    return {
        x: layer.x + layer.w / 2 - w / 2,
        y: layer.y + layer.h / 2 - h / 2,
        w,
        h,
    };
}

/** Whether a free layer covers fixed text by more than a sliver (1 mm²). */
export function coversText(
    layer: Rect & { rotation?: number },
    zones: readonly Rect[],
): boolean {
    const box = boundsOf(layer);

    return zones.some((zone) => {
        const w =
            Math.min(box.x + box.w, zone.x + zone.w) - Math.max(box.x, zone.x);
        const h =
            Math.min(box.y + box.h, zone.y + zone.h) - Math.max(box.y, zone.y);

        return w > 0 && h > 0 && w * h > 1;
    });
}
