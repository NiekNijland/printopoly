import type { CenterMode } from '@/lib/edition/types';
import type { PhotoSource } from '@/lib/render/photo';
import { mm } from '@/lib/render/units';
import { useFitTextWidth } from '@/lib/render/use-fit-text';

import { FitText } from './fit-text';
import { PhotoSlot } from './photo-slot';
import { useRender } from './sheet';

/** Colours of the plate per theme (B125). Flat print colours, no gradients (B87). */
const PLATE = {
    classic: {
        fill: '#FFD84D',
        flap: '#E3B52A',
        text: '#1B1F24',
        shadow: undefined,
        pillFill: '#1B1F24',
        pillText: '#FFFDF7',
        pillStroke: '#1B1F24',
        back: undefined,
        tilt: -2.5,
    },
    riso: {
        fill: '#E6007E',
        flap: undefined,
        text: '#FFFDF7',
        shadow: '#1B1F24',
        pillFill: '#00A3E0',
        pillText: '#1B1F24',
        pillStroke: '#1B1F24',
        back: '#00A3E0',
        tilt: 2,
    },
    strak: {
        fill: '#1B1F24',
        flap: undefined,
        text: '#FFFFFF',
        shadow: undefined,
        pillFill: '#FFFFFF',
        pillText: '#1B1F24',
        pillStroke: '#1B1F24',
        back: undefined,
        tilt: 0,
    },
} as const;

const SPARTAN = "'League Spartan', 'Instrument Sans', sans-serif";

export interface EditionTitleProps {
    name: string;
    /** The line under the name; `undefined` leaves it out. */
    tagline: string | undefined;
    mode: CenterMode;
    photo: PhotoSource | undefined;
    /** Width over height of the photo as uploaded. */
    photoAspect: number | undefined;
    /** Quarter turns of the placement: a turned photo swaps its aspect ratio. */
    photoRotation: number;
    photoFrame: boolean;
    /** The free area on the diagonal in mm, with its middle at the middle of the centre. */
    w: number;
    h: number;
    /** 1 on the standard 360 mm centre; the sizes below scale with the board. */
    unit: number;
}

/** The size of a photo of the given shape that fits a box, without cropping it. */
function fit(
    aspect: number,
    maxW: number,
    maxH: number,
): { w: number; h: number } {
    const h = Math.min(maxH, maxW / aspect);

    return { w: h * aspect, h };
}

function turnedAspect(aspect: number, rotation: number): number {
    return Math.round(rotation / 90) % 2 === 0 ? aspect : 1 / aspect;
}

/**
 * The edition title in the middle of the board (B125): the name on a tilted plate in the colours of the
 * theme, an optional photo standing on the plate, or a logo instead of the name. Drawn in the frame of the
 * diagonal (left to right along the diagonal), so the caller rotates it.
 */
export function EditionTitle(props: EditionTitleProps) {
    // A logo is drawn by the centre itself (B187): straight or on the diagonal, in its own place.
    return (
        <PlateTitle
            {...props}
            withPhoto={props.mode === 'photo' && props.photo !== undefined}
        />
    );
}

function PlateTitle({
    name,
    tagline,
    photo,
    photoAspect,
    photoRotation,
    photoFrame,
    withPhoto,
    w,
    h,
    unit,
}: EditionTitleProps & { withPhoto: boolean }) {
    const { theme } = useRender();
    const look = PLATE[theme.id];
    const heading = theme.id === 'strak' ? theme.headingFont : SPARTAN;
    const weight = theme.id === 'strak' ? theme.headingWeight : 800;
    const maxInner = w * 0.84;
    const { result, widthMm } = useFitTextWidth({
        text: name,
        widthMm: maxInner,
        heightMm: 40 * unit,
        maxFontMm: 27 * unit,
        minFontMm: 6,
        fontFamily: heading,
        fontWeight: weight,
        lineHeight: 1,
    });
    const size = result.fontSizeMm;
    const tag = tagline === undefined || tagline.trim() === '' ? null : tagline;
    const tagFit = useFitTextWidth({
        text: tag ?? '',
        widthMm: w * 0.6,
        heightMm: 10 * unit,
        maxFontMm: 7 * unit,
        minFontMm: 3,
        fontFamily: SPARTAN,
        fontWeight: 800,
        lineHeight: 1,
    });
    const tagSize = tagFit.result.fontSizeMm;
    const pillH = tag === null ? 0 : tagSize * 1.9;
    const pillW = tagFit.widthMm / (1 - 0.03) + tagSize * 2.6;

    const padX = size * 0.6;
    const padY = size * 0.3;
    const textW = widthMm / (1 - 0.03) + 1;
    const plateW = Math.min(
        w * 0.96,
        Math.max(textW + padX * 2, pillW + padX, 80 * unit),
    );
    const belowText = pillH * 0.42;
    const plateH = size * 1 + padY * 2 + belowText;
    const lift = withPhoto ? 6 * unit : 0;
    const plateX = (w - plateW) / 2;
    const plateY = (h - plateH) / 2 + lift;
    const stroke = 1.7 * unit;
    const rx = theme.id === 'strak' ? 0 : 2.2 * unit;

    const aspect = turnedAspect(photoAspect ?? 4 / 3, photoRotation);
    const frameInset = photoFrame ? FRAME_INSET * unit : 0;
    const box = fit(aspect, 150 * unit, 62 * unit);
    const overlap = padY * 0.5;
    const photoX = (w - box.w) / 2;
    const photoY = plateY + overlap - box.h - frameInset;

    const ink = theme.ink;
    const tilt = look.tilt;
    const flap = 13 * unit;
    const drop = plateH * 0.2;

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: mm(plateX),
                    top: mm(plateY),
                    width: mm(plateW),
                    height: mm(plateH),
                    transform: `rotate(${tilt}deg)`,
                    transformOrigin: 'center',
                }}
                data-slot="edition-plate"
            >
                <svg
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: mm(plateW),
                        height: mm(plateH),
                        overflow: 'visible',
                    }}
                    viewBox={`0 0 ${plateW} ${plateH}`}
                    aria-hidden="true"
                >
                    {look.back !== undefined && (
                        <rect
                            x={-3.2 * unit}
                            y={3.4 * unit}
                            width={plateW}
                            height={plateH}
                            rx={rx}
                            fill={look.back}
                            stroke={ink}
                            strokeWidth={stroke}
                        />
                    )}
                    {look.flap !== undefined && (
                        <>
                            <polygon
                                points={`${-flap},${drop} ${stroke},${drop} ${stroke},${plateH + drop} ${-flap},${plateH + drop} ${-flap + flap * 0.38},${plateH / 2 + drop}`}
                                fill={look.flap}
                                stroke={ink}
                                strokeWidth={stroke}
                                strokeLinejoin="round"
                            />
                            <polygon
                                points={`${plateW + flap},${drop} ${plateW - stroke},${drop} ${plateW - stroke},${plateH + drop} ${plateW + flap},${plateH + drop} ${plateW + flap - flap * 0.38},${plateH / 2 + drop}`}
                                fill={look.flap}
                                stroke={ink}
                                strokeWidth={stroke}
                                strokeLinejoin="round"
                            />
                        </>
                    )}
                    <rect
                        x={stroke / 2}
                        y={stroke / 2}
                        width={plateW - stroke}
                        height={plateH - stroke}
                        rx={rx}
                        fill={look.fill}
                        stroke={ink}
                        strokeWidth={stroke}
                        strokeLinejoin="round"
                    />
                    <rect
                        x={stroke + 1.5 * unit}
                        y={stroke + 1.5 * unit}
                        width={plateW - 2 * stroke - 3 * unit}
                        height={plateH - 2 * stroke - 3 * unit}
                        rx={Math.max(0, rx - 1)}
                        fill="none"
                        stroke={look.text}
                        strokeWidth={0.5 * unit}
                        opacity={theme.id === 'riso' ? 0.9 : 0.55}
                    />
                </svg>
                {look.shadow !== undefined && (
                    <FitText
                        text={name}
                        x={(plateW - textW) / 2 + 0.9 * unit}
                        y={padY - belowText / 2 + 0.9 * unit}
                        w={textW}
                        h={size + 1}
                        maxFontMm={size}
                        minFontMm={size}
                        font="heading"
                        weight={weight}
                        color={look.shadow}
                        align="center"
                        valign="middle"
                        lineHeight={1}
                    />
                )}
                <FitText
                    text={name}
                    x={(plateW - textW) / 2}
                    y={padY - belowText / 2}
                    w={textW}
                    h={size + 1}
                    maxFontMm={size}
                    minFontMm={size}
                    font="heading"
                    weight={weight}
                    color={look.text}
                    align="center"
                    valign="middle"
                    lineHeight={1}
                    slot="edition-name"
                />
                {tag !== null && (
                    <div
                        style={{
                            position: 'absolute',
                            left: mm((plateW - pillW) / 2),
                            top: mm(plateH - pillH * 0.62),
                            width: mm(pillW),
                            height: mm(pillH),
                            boxSizing: 'border-box',
                            background: look.pillFill,
                            border: `${mm(1.1 * unit)} solid ${look.pillStroke}`,
                            borderRadius: mm(theme.id === 'strak' ? 0 : pillH),
                        }}
                        data-slot="edition-tagline-pill"
                    >
                        <FitText
                            text={tag}
                            x={0}
                            y={0}
                            w={pillW - 2.2 * unit}
                            h={pillH - 2.2 * unit}
                            maxFontMm={tagSize}
                            minFontMm={tagSize}
                            font="heading"
                            weight={800}
                            color={look.pillText}
                            align="center"
                            valign="middle"
                            lineHeight={1}
                            slot="edition-tagline"
                        />
                    </div>
                )}
            </div>
            {withPhoto && (
                <FramedPhoto
                    x={photoX}
                    y={photoY}
                    w={box.w}
                    h={box.h}
                    photo={photo}
                    frame={photoFrame}
                    inset={frameInset}
                    unit={unit}
                    tilt={tilt}
                />
            )}
        </>
    );
}

/** The paper around a framed photo, in mm per side, on a full ribbon (`unit` 1). */
export const FRAME_INSET = 2.4;

/**
 * The photo of "Naam met foto" (B125): in a paper frame with an ink edge, a little askew like a photo laid on the
 * board, or without a frame for a cut-out PNG. `x`, `y`, `w` and `h` are the photo itself; the frame lies around it.
 */
export function FramedPhoto({
    x,
    y,
    w,
    h,
    photo,
    frame,
    inset,
    unit,
    tilt,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    photo: PhotoSource | undefined;
    frame: boolean;
    inset: number;
    unit: number;
    /** The tilt of the plate of the theme; the frame leans the other way. */
    tilt: number;
}) {
    const { theme } = useRender();

    return (
        <div
            style={{
                position: 'absolute',
                left: mm(x - inset),
                top: mm(y - inset),
                width: mm(w + 2 * inset),
                height: mm(h + 2 * inset),
                boxSizing: 'border-box',
                background: frame ? '#FFFDF7' : undefined,
                border: frame
                    ? `${mm(1.3 * unit)} solid ${theme.ink}`
                    : undefined,
                borderRadius: frame ? mm(1.5 * unit) : undefined,
                transform:
                    frame && tilt !== 0
                        ? `rotate(${-tilt * 1.3}deg)`
                        : undefined,
                transformOrigin: 'center bottom',
            }}
            data-slot="edition-photo"
        >
            <PhotoSlot x={0} y={0} w={w} h={h} photo={photo} />
        </div>
    );
}

/** The tilt of the name plate per theme, for a photo that leans against it. */
export function plateTilt(themeId: keyof typeof PLATE): number {
    return PLATE[themeId].tilt;
}
