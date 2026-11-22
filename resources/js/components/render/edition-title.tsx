import type { CenterMode, TitleStyle } from '@/lib/edition/types';
import type { PhotoSource } from '@/lib/render/photo';
import type { Theme, ThemeId } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import { useFitTextWidth } from '@/lib/render/use-fit-text';

import { FitText } from './fit-text';
import { PhotoSlot } from './photo-slot';
import { useRender } from './sheet';

export interface PlateLook {
    fill: string;
    flap: string | undefined;
    text: string;
    shadow: string | undefined;
    pillFill: string;
    pillText: string;
    pillStroke: string;
    back: string | undefined;
    tilt: number;
    /** The outline of the plate; the ink of the theme when absent. */
    edge?: string;
    /** Width of the outline compared with the standard 1.7 mm. */
    edgeScale?: number;
    /** The thin inner line; the text colour at half strength when absent. */
    inner?: string;
    /** Corner radius in mm on the standard centre. */
    radius: number;
    /** The tagline in the heading font of the theme, instead of League Spartan. */
    tagInHeading?: boolean;
}

/** Colours of the plate per theme (B125). Flat print colours, no gradients (B87). */
const PLATE: Record<ThemeId, PlateLook> = {
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
        radius: 2.2,
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
        inner: '#FFFDF7',
        radius: 2.2,
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
        radius: 0,
    },
    // Gala (B247): an ivory place card on a champagne one, straight, with a thin gold edge and a gold inner line.
    gala: {
        fill: '#FFFCF5',
        flap: undefined,
        text: '#2B2621',
        shadow: undefined,
        pillFill: '#FFFCF5',
        pillText: '#8C6A22',
        pillStroke: '#8C6A22',
        back: '#EFE3CC',
        tilt: 0,
        edge: '#8C6A22',
        edgeScale: 0.45,
        inner: '#B8923F',
        radius: 1.2,
        tagInHeading: true,
    },
};

/**
 * "Lint" (Niek, 22 nov): the ribbon of Klassiek with its folded ends and tilt, in the inks of each theme. On Klassiek it
 * is the plate of the theme itself.
 */
const RIBBON: Record<ThemeId, PlateLook> = {
    classic: PLATE.classic,
    riso: {
        fill: '#E6007E',
        flap: '#00A3E0',
        text: '#FFFDF7',
        shadow: undefined,
        pillFill: '#00A3E0',
        pillText: '#1B1F24',
        pillStroke: '#1B1F24',
        back: undefined,
        tilt: -2.5,
        inner: '#FFFDF7',
        radius: 2.2,
    },
    strak: {
        fill: '#1B1F24',
        flap: '#4A4F57',
        text: '#FFFFFF',
        shadow: undefined,
        pillFill: '#FFFFFF',
        pillText: '#1B1F24',
        pillStroke: '#1B1F24',
        back: undefined,
        tilt: -2.5,
        radius: 2.2,
    },
    gala: {
        fill: '#EFE3CC',
        flap: '#D9C7A3',
        text: '#2B2621',
        shadow: undefined,
        pillFill: '#FFFCF5',
        pillText: '#8C6A22',
        pillStroke: '#8C6A22',
        back: undefined,
        tilt: -2.5,
        edge: '#8C6A22',
        edgeScale: 0.45,
        inner: '#B8923F',
        radius: 1.2,
        tagInHeading: true,
    },
};

/**
 * The strong ink of each theme, for the bar, the stamp and the script (Niek, 22 nov): the red of Klassiek, the
 * magenta of Riso, the black of Strak and the gold of Gala, with the paper on top of it. Light text on these is at
 * least 4.4 : 1, for large letters only (B247).
 */
const MARK: Record<ThemeId, { ink: string; on: string }> = {
    classic: { ink: '#C8321F', on: '#FFFDF7' },
    riso: { ink: '#E6007E', on: '#FFFDF7' },
    strak: { ink: '#1B1F24', on: '#FFFFFF' },
    gala: { ink: '#8C6A22', on: '#FFFCF5' },
};

/** "Balk": a straight block in the strong ink with an ink edge and a light inner line, like the title of the game. */
function barLook(theme: Theme): PlateLook {
    const mark = MARK[theme.id];

    return {
        fill: mark.ink,
        flap: undefined,
        text: mark.on,
        shadow: undefined,
        pillFill: theme.paper,
        pillText: theme.ink,
        pillStroke: theme.ink,
        back: undefined,
        tilt: 0,
        edge: theme.ink,
        inner: mark.on,
        radius: 0,
        tagInHeading: true,
    };
}

/** The plate of a style that has one (the theme, Lint, Balk), also for the small pictures in the editor. */
export function plateLookOf(
    style: TitleStyle | undefined,
    theme: Theme,
): PlateLook {
    return style === 'ribbon'
        ? RIBBON[theme.id]
        : style === 'bar'
          ? barLook(theme)
          : PLATE[theme.id];
}

/** The strong ink of a theme for the stamp and the script. */
export function titleMarkOf(theme: Theme): string {
    return MARK[theme.id].ink;
}

const SPARTAN = "'League Spartan', 'Instrument Sans', sans-serif";
const GREAT_VIBES = "'Great Vibes', 'Playfair Display', cursive";
const PLAYFAIR = "'Playfair Display', Georgia, serif";

/** The font of the name in a title style. */
interface NameFont {
    family: string;
    weight: number;
    /** How much larger than League Spartan the name may grow: a script has small letters for its size. */
    scale: number;
    upper: boolean;
}

/** The font of the name per style: the title font of the theme, or a font of the style itself. */
export function titleFontOf(
    style: TitleStyle | undefined,
    theme: Theme,
): NameFont {
    switch (style) {
        case 'bar':
        case 'stamp':
            return {
                family: theme.headingFont,
                weight: theme.headingWeight,
                scale: 1,
                upper: true,
            };
        case 'script':
            return {
                family: GREAT_VIBES,
                weight: 400,
                scale: 1.5,
                upper: false,
            };
        default:
            return {
                family: theme.titleFont,
                weight: theme.titleWeight,
                scale: theme.titleScale,
                upper: false,
            };
    }
}

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
    /** The look of the name (Niek, 22 nov); `undefined` is the plate of the theme. */
    titleStyle?: TitleStyle;
}

type TitleProps = EditionTitleProps & { withPhoto: boolean };

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
    const withPhoto = props.mode === 'photo' && props.photo !== undefined;

    switch (props.titleStyle) {
        case 'stamp':
            return <StampTitle {...props} withPhoto={withPhoto} />;
        case 'script':
            return <ScriptTitle {...props} withPhoto={withPhoto} />;
        case 'plain':
            return <PlainTitle {...props} withPhoto={withPhoto} />;
        default:
            return <PlateTitle {...props} withPhoto={withPhoto} />;
    }
}

/** The name as drawn: in capitals for a style that sets it so, in the language of the edition. */
function useShownName(name: string, upper: boolean): string {
    const { locale } = useRender();

    return upper ? name.toLocaleUpperCase(locale) : name;
}

function PlateTitle({
    name: typed,
    tagline,
    photo,
    photoAspect,
    photoRotation,
    photoFrame,
    withPhoto,
    w,
    h,
    unit,
    titleStyle,
}: TitleProps) {
    const { theme } = useRender();
    const look = plateLookOf(titleStyle, theme);
    const font = titleFontOf(titleStyle, theme);
    const name = useShownName(typed, font.upper);
    const heading = font.family;
    const weight = font.weight;
    const tagFont = look.tagInHeading === true ? theme.headingFont : SPARTAN;
    const tagWeight = look.tagInHeading === true ? theme.headingWeight : 800;
    const maxInner = w * 0.84;
    const { result, widthMm } = useFitTextWidth({
        text: name,
        widthMm: maxInner,
        heightMm: 40 * font.scale * unit,
        maxFontMm: 27 * font.scale * unit,
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
        fontFamily: tagFont,
        fontWeight: tagWeight,
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
    const stroke = 1.7 * (look.edgeScale ?? 1) * unit;
    const rx = look.radius * unit;

    const aspect = turnedAspect(photoAspect ?? 4 / 3, photoRotation);
    const frameInset = photoFrame ? FRAME_INSET * unit : 0;
    const box = fit(aspect, 150 * unit, 62 * unit);
    const overlap = padY * 0.5;
    const photoX = (w - box.w) / 2;
    const photoY = plateY + overlap - box.h - frameInset;

    const ink = look.edge ?? theme.ink;
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
                data-title-style={titleStyle ?? 'theme'}
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
                        stroke={look.inner ?? look.text}
                        strokeWidth={0.5 * unit}
                        opacity={look.inner === undefined ? 0.55 : 0.9}
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
                        family={heading}
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
                    family={heading}
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
                            border: `${mm(1.1 * (look.edgeScale ?? 1) * unit)} solid ${look.pillStroke}`,
                            borderRadius: mm(look.radius === 0 ? 0 : pillH),
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
                            weight={tagWeight}
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

/**
 * The photo of "Naam met foto" over the middle, standing on a title that is no plate (Niek, 22 nov): the same size as
 * on the plate, with its foot `top` mm from the top of the title area.
 */
function PhotoOnTitle({
    props,
    top,
    tilt,
}: {
    props: TitleProps;
    top: number;
    tilt: number;
}) {
    const { photo, photoAspect, photoRotation, photoFrame, w, unit } = props;
    const aspect = turnedAspect(photoAspect ?? 4 / 3, photoRotation);
    const inset = photoFrame ? FRAME_INSET * unit : 0;
    const box = fit(aspect, 150 * unit, 62 * unit);

    return (
        <FramedPhoto
            x={(w - box.w) / 2}
            y={top - box.h - inset}
            w={box.w}
            h={box.h}
            photo={photo}
            frame={photoFrame}
            inset={inset}
            unit={unit}
            tilt={tilt}
        />
    );
}

/** The tagline, or `null` when there is none. */
function taglineOf(tagline: string | undefined): string | null {
    return tagline === undefined || tagline.trim() === '' ? null : tagline;
}

/** How far the stamp leans, in degrees. */
const STAMP_TILT = 3;

/** A five-pointed star of radius `r` around (cx, cy), for the stamp. */
function starPoints(cx: number, cy: number, r: number): string {
    return Array.from({ length: 10 }, (_, index) => {
        const radius = index % 2 === 0 ? r : r * 0.45;
        const angle = (Math.PI / 5) * index - Math.PI / 2;

        return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
    }).join(' ');
}

/**
 * "Stempel" (Niek, 22 nov): the name in capitals in the strong ink of the theme on paper, inside a double edge with
 * rounded corners, a little askew like a rubber stamp. The tagline sits under a thin line between two stars.
 */
function StampTitle(props: TitleProps) {
    const { name: typed, tagline, withPhoto, w, h, unit } = props;
    const { theme } = useRender();
    const mark = MARK[theme.id].ink;
    const font = titleFontOf('stamp', theme);
    const name = useShownName(typed, true);
    const tag = taglineOf(tagline);
    const upperTag = useShownName(tag ?? '', true);
    const tagFit = useFitTextWidth({
        text: upperTag,
        widthMm: w * 0.5,
        heightMm: 8 * unit,
        maxFontMm: 6 * unit,
        minFontMm: 2.6,
        fontFamily: font.family,
        fontWeight: font.weight,
        lineHeight: 1,
    });
    const tagSize = tagFit.result.fontSizeMm;
    const tagRow = tag === null ? 0 : tagSize * 2.4;
    // Room for the name: the stamp stays inside the title area, also on a low lid, with its tilt.
    const nameRoom =
        (h * 0.95 -
            w * 0.94 * Math.sin((STAMP_TILT * Math.PI) / 180) -
            tagRow) /
        1.8;
    const { result, widthMm } = useFitTextWidth({
        text: name,
        widthMm: w * 0.74,
        heightMm: Math.min(30 * unit, nameRoom * 1.2),
        maxFontMm: Math.min(25 * unit, nameRoom),
        minFontMm: 5,
        fontFamily: font.family,
        fontWeight: font.weight,
        lineHeight: 1,
    });
    const size = result.fontSizeMm;
    const textW = widthMm / (1 - 0.03) + 1;
    const tagW = tagFit.widthMm / (1 - 0.03) + 1;
    const padX = Math.max(size * 0.7, 9 * unit);
    const padTop = size * 0.42;
    const padBottom = size * 0.38;
    const plateW = Math.min(
        w * 0.94,
        Math.max(textW, tag === null ? 0 : tagW + tagSize * 5) + 2 * padX,
    );
    const plateH = padTop + size + tagRow + padBottom;
    const lift = withPhoto ? 6 * unit : 0;
    const plateX = (w - plateW) / 2;
    const plateY = (h - plateH) / 2 + lift;
    const outer = 1.3 * unit;
    const gap = 2.2 * unit;
    const rx = 3.5 * unit;
    const ruleY = padTop + size + tagSize * 0.55;
    const tagY = ruleY + tagSize * 0.45;
    const star = tagSize * 0.55;
    const tilt = -STAMP_TILT;

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
                data-title-style="stamp"
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
                    <rect
                        x={outer / 2}
                        y={outer / 2}
                        width={plateW - outer}
                        height={plateH - outer}
                        rx={rx}
                        fill={theme.paper}
                        stroke={mark}
                        strokeWidth={outer}
                    />
                    <rect
                        x={outer + gap}
                        y={outer + gap}
                        width={plateW - 2 * (outer + gap)}
                        height={plateH - 2 * (outer + gap)}
                        rx={Math.max(0, rx - gap)}
                        fill="none"
                        stroke={mark}
                        strokeWidth={0.5 * unit}
                    />
                    {tag !== null && (
                        <>
                            <line
                                x1={plateW / 2 - tagW / 2 - tagSize * 2}
                                x2={plateW / 2 + tagW / 2 + tagSize * 2}
                                y1={ruleY}
                                y2={ruleY}
                                stroke={mark}
                                strokeWidth={0.4 * unit}
                            />
                            {[-1, 1].map((side) => (
                                <polygon
                                    key={side}
                                    points={starPoints(
                                        plateW / 2 +
                                            side * (tagW / 2 + tagSize * 1.3),
                                        tagY + tagSize * 0.85,
                                        star,
                                    )}
                                    fill={mark}
                                />
                            ))}
                        </>
                    )}
                </svg>
                <FitText
                    text={name}
                    x={(plateW - textW) / 2}
                    y={padTop}
                    w={textW}
                    h={size + 1}
                    maxFontMm={size}
                    minFontMm={size}
                    family={font.family}
                    weight={font.weight}
                    color={mark}
                    align="center"
                    valign="middle"
                    lineHeight={1}
                    slot="edition-name"
                />
                {tag !== null && (
                    <FitText
                        text={upperTag}
                        x={(plateW - tagW) / 2}
                        y={tagY}
                        w={tagW}
                        h={tagSize * 1.7}
                        maxFontMm={tagSize}
                        minFontMm={tagSize}
                        family={font.family}
                        weight={font.weight}
                        color={mark}
                        align="center"
                        valign="middle"
                        lineHeight={1}
                        slot="edition-tagline"
                    />
                )}
            </div>
            {withPhoto && (
                <PhotoOnTitle
                    props={props}
                    top={plateY - 2 * unit}
                    tilt={tilt}
                />
            )}
        </>
    );
}

/** A diamond of half-size `r` around (cx, cy), for the script rule. */
function diamondPoints(cx: number, cy: number, r: number): string {
    return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

/**
 * "Sierlijk" (Niek, 22 nov): the name in the script of Gala in the strong ink of the theme, with no shape behind it,
 * and under it a fine rule with a diamond on each side of the tagline in serif capitals.
 */
function ScriptTitle(props: TitleProps) {
    const { name, tagline, withPhoto, w, h, unit } = props;
    const { theme } = useRender();
    const mark = MARK[theme.id].ink;
    const font = titleFontOf('script', theme);
    const tag = taglineOf(tagline);
    const upperTag = useShownName(tag ?? '', true);
    const tagFit = useFitTextWidth({
        text: upperTag,
        widthMm: w * 0.5,
        heightMm: 7 * unit,
        maxFontMm: 5.4 * unit,
        minFontMm: 2.6,
        fontFamily: PLAYFAIR,
        fontWeight: 700,
        lineHeight: 1,
    });
    const tagSize = tagFit.result.fontSizeMm;
    const row = tag === null ? 3 * unit : tagSize * 1.6;
    const gap = 1.5 * unit;
    // A script reaches above and below its line: the line box is 1.25 times the size.
    const nameRoom = (h * 0.92 - row - gap) / 1.25;
    const { result, widthMm } = useFitTextWidth({
        text: name,
        widthMm: w * 0.88,
        heightMm: Math.min(54 * unit, nameRoom * 1.25),
        maxFontMm: Math.min(27 * font.scale * unit, nameRoom),
        minFontMm: 6,
        fontFamily: font.family,
        fontWeight: font.weight,
        lineHeight: 1.25,
    });
    const size = result.fontSizeMm;
    const textW = widthMm / (1 - 0.03) + 2;
    const nameH = size * 1.25;
    const blockH = nameH + gap + row;
    const lift = withPhoto ? 6 * unit : 0;
    const top = (h - blockH) / 2 + lift;
    const rowY = top + nameH + gap + row / 2;
    const tagW = tag === null ? 0 : tagFit.widthMm / (1 - 0.03) + 1;
    const half = Math.min(w / 2, Math.max(textW * 0.45, tagW / 2 + 20 * unit));
    const diamond = 1.3 * unit;
    const inner = tag === null ? 0 : tagW / 2 + tagSize * 1.2;

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: mm(w),
                    height: mm(h),
                }}
                data-slot="edition-plate"
                data-title-style="script"
            >
                <svg
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: mm(w),
                        height: mm(h),
                        overflow: 'visible',
                    }}
                    viewBox={`0 0 ${w} ${h}`}
                    aria-hidden="true"
                >
                    {[-1, 1].map((side) => (
                        <g key={side}>
                            <line
                                x1={w / 2 + side * (inner + diamond * 2)}
                                x2={w / 2 + side * half}
                                y1={rowY}
                                y2={rowY}
                                stroke={mark}
                                strokeWidth={0.45 * unit}
                                strokeLinecap="round"
                            />
                            <polygon
                                points={diamondPoints(
                                    w / 2 + side * inner,
                                    rowY,
                                    diamond,
                                )}
                                fill={mark}
                            />
                        </g>
                    ))}
                </svg>
                <FitText
                    text={name}
                    x={(w - textW) / 2}
                    y={top}
                    w={textW}
                    h={nameH}
                    maxFontMm={size}
                    minFontMm={size}
                    family={font.family}
                    weight={font.weight}
                    color={mark}
                    align="center"
                    valign="middle"
                    lineHeight={1.25}
                    slot="edition-name"
                />
                {tag !== null && (
                    <FitText
                        text={upperTag}
                        x={(w - tagW) / 2}
                        y={rowY - row / 2}
                        w={tagW}
                        h={row}
                        maxFontMm={tagSize}
                        minFontMm={tagSize}
                        family={PLAYFAIR}
                        weight={700}
                        color={theme.ink}
                        align="center"
                        valign="middle"
                        lineHeight={1}
                        slot="edition-tagline"
                    />
                )}
            </div>
            {withPhoto && (
                <PhotoOnTitle props={props} top={top - unit} tilt={0} />
            )}
        </>
    );
}

/**
 * "Alleen tekst" (Niek, 22 nov): the name in the title font of the theme in ink, the tagline under it in the body
 * font, and nothing behind them.
 */
function PlainTitle(props: TitleProps) {
    const { name, tagline, withPhoto, w, h, unit } = props;
    const { theme } = useRender();
    const font = titleFontOf('plain', theme);
    const tag = taglineOf(tagline);
    const tagFit = useFitTextWidth({
        text: tag ?? '',
        widthMm: w * 0.7,
        heightMm: 9 * unit,
        maxFontMm: 6.5 * unit,
        minFontMm: 3,
        fontFamily: theme.bodyFont,
        fontWeight: 600,
        lineHeight: 1,
    });
    const tagSize = tag === null ? 0 : tagFit.result.fontSizeMm;
    const line = font.scale > 1 ? 1.25 : 1.05;
    const nameRoom = (h * 0.92 - tagSize * 1.5) / line;
    const { result, widthMm } = useFitTextWidth({
        text: name,
        widthMm: w * 0.9,
        heightMm: Math.min(40 * font.scale * unit, nameRoom * line),
        maxFontMm: Math.min(27 * font.scale * unit, nameRoom),
        minFontMm: 6,
        fontFamily: font.family,
        fontWeight: font.weight,
        lineHeight: line,
    });
    const size = result.fontSizeMm;
    const textW = widthMm / (1 - 0.03) + 2;
    const nameH = size * line;
    const gap = tag === null ? 0 : size * 0.12;
    const blockH = nameH + gap + tagSize * 1.3;
    const lift = withPhoto ? 6 * unit : 0;
    const top = (h - blockH) / 2 + lift;
    const tagW = tagFit.widthMm / (1 - 0.03) + 1;

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: mm(w),
                    height: mm(h),
                }}
                data-slot="edition-plate"
                data-title-style="plain"
            >
                <FitText
                    text={name}
                    x={(w - textW) / 2}
                    y={top}
                    w={textW}
                    h={nameH}
                    maxFontMm={size}
                    minFontMm={size}
                    family={font.family}
                    weight={font.weight}
                    color={theme.ink}
                    align="center"
                    valign="middle"
                    lineHeight={line}
                    slot="edition-name"
                />
                {tag !== null && (
                    <FitText
                        text={tag}
                        x={(w - tagW) / 2}
                        y={top + nameH + gap}
                        w={tagW}
                        h={tagSize * 1.3}
                        maxFontMm={tagSize}
                        minFontMm={tagSize}
                        family={theme.bodyFont}
                        weight={600}
                        color={theme.ink}
                        align="center"
                        valign="middle"
                        lineHeight={1}
                        slot="edition-tagline"
                    />
                )}
            </div>
            {withPhoto && (
                <PhotoOnTitle props={props} top={top - unit} tilt={0} />
            )}
        </>
    );
}
