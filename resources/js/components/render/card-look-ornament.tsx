import { useContext } from 'react';
import { reportError } from '@/lib/bugsnag';

import { mm } from '@/lib/render/units';

import { RasterNotePattern } from './banknote-parts';
import { Svg } from './sheet';

/** One shape of an ornament, in mm: a stroke, a fill, or both. */
export type OrnamentItem = {
    d: string;
    stroke?: string;
    widthMm?: number;
    fill?: string;
    /** Opacity of the stroke, for the faint line work. */
    alpha?: number;
    /** A box the shape is cut to. */
    clip?: { x: number; y: number; w: number; h: number };
    /** Round ends on a stroke (confetti). */
    round?: boolean;
};

/**
 * Pixels per mm of an ornament picture: 12 is 305 dpi, the resolution of a print shop, and sharp for the 0.08 mm
 * lines at print size. Finer would only make the PDF heavier.
 */
const ORNAMENT_PX_PER_MM = 12;

const ornamentPictures = new Map<string, string | null>();

/** A short fingerprint of an ornament, so equal ornaments on different cards share one picture. */
const fingerprint = (parts: readonly string[]): string => {
    let a = 5381;
    let b = 52711;
    for (const part of parts) {
        for (let i = 0; i < part.length; i++) {
            const c = part.charCodeAt(i);
            a = (Math.imul(a, 33) ^ c) >>> 0;
            b = (Math.imul(b, 31) + c) >>> 0;
        }
    }

    return `${a.toString(36)}${b.toString(36)}`;
};

/**
 * The fine line work of Vintage as one PNG, drawn once per kind (the back of every Chance card is the same
 * picture), like the guilloche of the notes (B270). Chrome writes vector line work into the PDF once per card, which
 * made a set of Vintage cards 19 MB; a picture it has written before it reuses. Returns null where there is no
 * canvas (tests, the server).
 */
const ornamentPicture = (
    key: string,
    w: number,
    h: number,
    background: string | undefined,
    items: readonly OrnamentItem[],
): string | null => {
    const hit = ornamentPictures.get(key);
    if (hit !== undefined) {
        return hit;
    }

    let url: string | null = null;
    if (typeof document !== 'undefined' && typeof Path2D !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * ORNAMENT_PX_PER_MM));
        canvas.height = Math.max(1, Math.round(h * ORNAMENT_PX_PER_MM));
        let context: CanvasRenderingContext2D | null = null;
        try {
            context = canvas.getContext('2d');
        } catch (error) {
            reportError(error);
            context = null;
        }
        if (context !== null) {
            context.scale(canvas.width / w, canvas.height / h);
            context.lineJoin = 'round';
            if (background !== undefined) {
                context.fillStyle = background;
                context.fillRect(0, 0, w, h);
            }
            for (const item of items) {
                const path = new Path2D(item.d);
                context.save();
                if (item.clip !== undefined) {
                    context.beginPath();
                    context.rect(
                        item.clip.x,
                        item.clip.y,
                        item.clip.w,
                        item.clip.h,
                    );
                    context.clip();
                }
                if (item.fill !== undefined) {
                    context.fillStyle = item.fill;
                    context.fill(path);
                }
                if (item.stroke !== undefined) {
                    context.globalAlpha = item.alpha ?? 1;
                    context.lineCap = item.round === true ? 'round' : 'butt';
                    context.strokeStyle = item.stroke;
                    context.lineWidth = item.widthMm ?? 0.1;
                    context.stroke(path);
                }
                context.restore();
            }
            try {
                const data = canvas.toDataURL('image/png');
                url = data.startsWith('data:image/png') ? data : null;
            } catch (error) {
                reportError(error);
                url = null;
            }
        }
    }
    ornamentPictures.set(key, url);

    return url;
};

type OrnamentProps = {
    x: number;
    y: number;
    w: number;
    h: number;
    items: readonly OrnamentItem[];
    background?: string;
    slot: string;
};

const ornamentKey = (
    w: number,
    h: number,
    background: string | undefined,
    items: readonly OrnamentItem[],
): string => {
    return fingerprint([
        String(w),
        String(h),
        background ?? '',
        ...items.flatMap((item) => [
            item.d,
            item.stroke ?? '',
            item.fill ?? '',
            String(item.widthMm ?? ''),
            String(item.alpha ?? ''),
            item.round === true ? 'r' : '',
            item.clip === undefined
                ? ''
                : `${String(item.clip.x)},${String(item.clip.y)},${String(item.clip.w)},${String(item.clip.h)}`,
        ]),
    ]);
};

const OrnamentVector = ({ x, y, w, h, items, slot }: OrnamentProps) => {
    return (
        <Svg x={x} y={y} w={w} h={h} slot={slot}>
            {items.map((item, index) => {
                const clipId =
                    item.clip === undefined
                        ? undefined
                        : `${slot}-clip-${String(index)}`;

                return (
                    <g key={index}>
                        {item.clip !== undefined && (
                            <clipPath id={clipId}>
                                <rect
                                    x={item.clip.x}
                                    y={item.clip.y}
                                    width={item.clip.w}
                                    height={item.clip.h}
                                />
                            </clipPath>
                        )}
                        <path
                            d={item.d}
                            fill={item.fill ?? 'none'}
                            stroke={item.stroke}
                            strokeWidth={item.widthMm}
                            strokeOpacity={item.alpha}
                            strokeLinecap={
                                item.round === true ? 'round' : undefined
                            }
                            strokeLinejoin="round"
                            clipPath={
                                clipId === undefined
                                    ? undefined
                                    : `url(#${clipId})`
                            }
                        />
                    </g>
                );
            })}
        </Svg>
    );
};

/**
 * Ornament shapes in a box of `w` x `h` mm at (`x`, `y`); the shapes are in mm of the box. On a print sheet they
 * are one picture per kind (B269); on screen and in tests they stay vector, sharp at any zoom. With a `background`
 * the picture is opaque paper, which keeps it light: it then has to be the first thing drawn in its box.
 */
export const Ornament = ({
    x,
    y,
    w,
    h,
    items,
    background,
    slot,
}: OrnamentProps) => {
    const raster = useContext(RasterNotePattern);
    const picture = raster
        ? ornamentPicture(
              ornamentKey(w, h, background, items),
              w,
              h,
              background,
              items,
          )
        : null;

    if (picture !== null) {
        return (
            <img
                src={picture}
                alt=""
                aria-hidden="true"
                data-slot={slot}
                data-raster=""
                style={{
                    position: 'absolute',
                    left: mm(x),
                    top: mm(y),
                    width: mm(w),
                    height: mm(h),
                    maxWidth: 'none',
                }}
            />
        );
    }

    return <OrnamentVector x={x} y={y} w={w} h={h} items={items} slot={slot} />;
};
