import type { Rect, Size } from '@/types/print';

/**
 * How the photo sits on the lid: none, in a frame above the title, over the whole lid (B124), or the logo of the
 * board centre in the place of the board picture (B241, B256).
 */
export type LidPhoto = 'none' | 'framed' | 'full' | 'logo';

export type LidLayoutInput = {
    photo: LidPhoto;
    /** Where the title sits on a photo over the whole lid, -1 (top) to 1 (bottom); 0 is the standard place (B170). */
    offset?: number;
    /** Whether there is a line under the title (the standard "Een spel voor 2 tot 8 spelers" or an own one). */
    subtitle: boolean;
    /** Whether there are own lines under the subtitle (B169). */
    lines: boolean;
};

/** Where the fixed text of the box lid goes, in mm from the top left of the lid. */
export type LidLayout = {
    /** The photo frame; `undefined` without a photo, the whole lid (plus bleed) for a full photo. */
    photo: Rect | undefined;
    /** The block behind the text on a full photo: the band, or the fade when the band is off. */
    block: Rect | undefined;
    title: Rect;
    subtitle: Rect | undefined;
    lines: Rect | undefined;
    /**
     * The picture of a lid without an own photo (B256): the board of the edition, slightly turned. The logo of the
     * board centre takes this place, whole and straight, when the lid shows it (B241).
     */
    picture: Rect | undefined;
    /** The strip of the street colours along the bottom of a lid without an own photo (B256). */
    strip: Rect | undefined;
};

const MARGIN = 12;

/**
 * The places of the title, the subtitle and the own lines on the box lid. The renderer and the Controle use the
 * same numbers, so a free layer that covers the fixed text is found (bug 36 of ronde 3).
 */
export const lidLayout = (size: Size, input: LidLayoutInput): LidLayout => {
    const { w, h } = size;
    const inner = w - 2 * MARGIN;
    // The subtitle and the own lines grow with the lid, so they read from across the table (R5-29, Sophie, Sem).
    const linesHeight = input.lines ? Math.min(36, h * 0.13) : 0;

    if (input.photo === 'full') {
        const titleHeight = h * 0.28 * 0.62;
        const subtitleHeight = input.subtitle ? Math.max(9, h * 0.05) : 0;
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
            picture: undefined,
            strip: undefined,
        };
    }

    if (input.photo === 'none' || input.photo === 'logo') {
        return pictureLayout(size, input, linesHeight);
    }

    // A photo in a frame above the title. With own lines the photo gives up a little height, so everything stays
    // inside the frame.
    const photoHeight = h * 0.58 - linesHeight;
    const titleTop = 10 + photoHeight + 6;
    const titleHeight = h * 0.2;
    const subtitleTop = titleTop + titleHeight + 2;
    const subtitleHeight = input.subtitle ? Math.max(9, h * 0.048) : 0;
    const linesTop = subtitleTop + subtitleHeight + 2;

    return {
        photo: { x: MARGIN, y: MARGIN, w: inner, h: photoHeight },
        block: undefined,
        title: { x: MARGIN, y: titleTop, w: inner, h: titleHeight },
        subtitle: input.subtitle
            ? { x: MARGIN, y: subtitleTop, w: inner, h: subtitleHeight }
            : undefined,
        lines: input.lines
            ? { x: MARGIN, y: linesTop, w: inner, h: linesHeight }
            : undefined,
        picture: undefined,
        strip: undefined,
    };
};

/**
 * A lid without an own photo (B256): the name on the plate of the theme at the top, the board of the edition as
 * the picture in the middle, the subtitle and own lines under it, and the street colours along the bottom.
 */
const pictureLayout = (
    size: Size,
    input: LidLayoutInput,
    linesHeight: number,
): LidLayout => {
    const { w, h } = size;
    const inner = w - 2 * MARGIN;
    const titleTop = h * 0.07;
    const titleHeight = h * 0.19;
    const subtitleHeight = input.subtitle ? Math.max(9, h * 0.048) : 0;
    const stripHeight = Math.max(3, h * 0.016);
    const stripTop = h - MARGIN - stripHeight;
    const gap = h * 0.03;
    const below = subtitleHeight + (input.lines ? linesHeight + 2 : 0);
    const pictureTop = titleTop + titleHeight + gap;
    const picture = Math.max(
        h * 0.2,
        Math.min(inner * 0.62, stripTop - gap - below - gap - pictureTop),
    );
    const subtitleTop = pictureTop + picture + gap;
    const linesTop = subtitleTop + subtitleHeight + 2;

    return {
        photo: undefined,
        block: undefined,
        title: { x: MARGIN, y: titleTop, w: inner, h: titleHeight },
        subtitle: input.subtitle
            ? { x: MARGIN, y: subtitleTop, w: inner, h: subtitleHeight }
            : undefined,
        lines: input.lines
            ? { x: MARGIN, y: linesTop, w: inner, h: linesHeight }
            : undefined,
        picture: {
            x: w / 2 - picture / 2,
            y: pictureTop,
            w: picture,
            h: picture,
        },
        strip: { x: MARGIN, y: stripTop, w: inner, h: stripHeight },
    };
};

/** The areas of fixed text on the lid, for the red zone in the editor and the Controle (bug 36). */
export const lidTextZones = (layout: LidLayout): Rect[] => {
    return [layout.title, layout.subtitle, layout.lines].filter(
        (rect): rect is Rect => rect !== undefined,
    );
};

/** The box around a free layer, turned by its rotation, in mm. */
const boundsOf = (layer: Rect & { rotation?: number }): Rect => {
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
};

/** Whether a free layer covers fixed text by more than a sliver (1 mm²). */
export const coversText = (
    layer: Rect & { rotation?: number },
    zones: readonly Rect[],
): boolean => {
    const box = boundsOf(layer);

    return zones.some((zone) => {
        const w =
            Math.min(box.x + box.w, zone.x + zone.w) - Math.max(box.x, zone.x);
        const h =
            Math.min(box.y + box.h, zone.y + zone.h) - Math.max(box.y, zone.y);

        return w > 0 && h > 0 && w * h > 1;
    });
};
