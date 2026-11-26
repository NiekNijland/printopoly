import type { ReactNode } from 'react';

import { mix } from '@/lib/render/color';
import {
    CORNER_TEXT_ANGLE,
    diagonalBandWidth,
    jailNameParts,
    splitBalanced,
    visitingLegs,
    type Bounds,
} from '@/lib/render/corner-layout';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import type { Layout } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import type { CornerSpace } from '@/types/game';

import {
    Confetti,
    QuarterDisc,
    RULE_INSET,
    TILE_GAP,
    useBoardLook,
} from './board-look';
import { FitText } from './fit-text';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

export interface CornerContentProps {
    space: CornerSpace;
    /** Side of the square corner in mm. */
    size: number;
    name: string;
    text?: string;
    layout: Layout;
    photo?: PhotoSource;
    icon?: SpaceIconSource;
    money: (amount: number) => string;
}

/**
 * The four corners, after the build of the classic board but in our own drawings (B87): the text on the 45°
 * diagonal, a picture in the middle, Start with its long arrow along the edge and the jail with its cell in the
 * inner point and "op bezoek" as an L along the outer edges. Drawn upright in the frame of Start (inner point top
 * left); the board turns each corner into its place (see `cornerRotation`).
 */
export function CornerContent(props: CornerContentProps) {
    return (
        <>
            <CornerDecoration {...props} />
            {props.space.corner === 'start' ? (
                <StartCorner {...props} />
            ) : props.space.corner === 'jail' ? (
                <JailCorner {...props} />
            ) : (
                <PictureCorner {...props} />
            )}
        </>
    );
}

/**
 * What a board style (B268) adds under a corner: Modern a flat quarter disc in the outer corner, Speels some
 * confetti in the free corners. The jail keeps its cell; Vintage draws its rules with the space (board-space.tsx).
 */
function CornerDecoration({ space, size: c }: CornerContentProps) {
    const { theme } = useRender();
    const { style } = useBoardLook();

    if (space.corner === 'jail') {
        return null;
    }
    if (style === 'modern') {
        return (
            <QuarterDisc
                size={c}
                radius={c * 0.58}
                color={mix(theme.paper, theme.secondaryAccent, 0.2)}
            />
        );
    }
    if (style === 'playful') {
        return (
            <Confetti
                size={c}
                colors={[
                    theme.secondaryAccent,
                    theme.deckAccent.chance,
                    theme.deckAccent.chest,
                ]}
                seed={space.position}
                outer={space.corner !== 'start'}
            />
        );
    }

    return null;
}

/** Margin to the outer edges, which are the cut edge of the board: never closer than 3 mm. */
function edgeMargin(c: number): number {
    return Math.max(3, c * 0.05);
}

/** A box turned around a point, for content on the diagonal; children are placed around (0, 0). */
function Turned({
    x,
    y,
    angle,
    children,
}: {
    x: number;
    y: number;
    angle: number;
    children: ReactNode;
}) {
    return (
        <div
            style={{
                position: 'absolute',
                left: mm(x),
                top: mm(y),
                width: 0,
                height: 0,
                transform: `rotate(${angle}deg)`,
            }}
            data-turned={angle}
        >
            {children}
        </div>
    );
}

interface Band {
    height: number;
    /** Draws the band in a box centred on (0, 0) in the turned frame: `x = -w / 2`, `y` from the top. */
    draw: (box: { x: number; y: number; w: number; h: number }) => ReactNode;
    /** Width cap of the band, for pictures that look odd when stretched. */
    maxWidth?: number;
}

/**
 * Bands stacked on the diagonal, from the inner point to the outer corner, each as wide as the square allows at
 * its height. `shift` moves the whole stack towards the inner point (positive) or the outer corner (negative).
 */
function DiagonalStack({
    bounds,
    bands,
    gap,
    shift = 0,
    inset = 0,
}: {
    bounds: Bounds;
    bands: readonly Band[];
    gap: number;
    shift?: number;
    /** Room kept free at both ends of every band. */
    inset?: number;
}) {
    const centre = {
        x: (bounds.left + bounds.right) / 2,
        y: (bounds.top + bounds.bottom) / 2,
    };
    const total =
        bands.reduce((sum, band) => sum + band.height, 0) +
        gap * Math.max(0, bands.length - 1);
    const start = -total / 2 - shift;
    const tops = bands.map(
        (_, index) =>
            start +
            bands
                .slice(0, index)
                .reduce((sum, band) => sum + band.height + gap, 0),
    );

    return (
        <Turned x={centre.x} y={centre.y} angle={CORNER_TEXT_ANGLE}>
            {bands.map((band, index) => {
                const y = tops[index] ?? start;
                const offset = -(y + band.height / 2);
                const w = Math.min(
                    band.maxWidth ?? Infinity,
                    Math.max(
                        0,
                        diagonalBandWidth(bounds, centre, offset, band.height) -
                            2 * inset,
                    ),
                );

                return (
                    <div key={index}>
                        {band.draw({ x: -w / 2, y, w, h: band.height })}
                    </div>
                );
            })}
        </Turned>
    );
}

function StartCorner({
    space,
    size: c,
    name,
    text,
    layout,
    photo,
    icon,
    money,
}: CornerContentProps) {
    const { theme, locale } = useRender();
    const look = useBoardLook();
    const t = STRINGS[locale];
    const m = edgeMargin(c);
    const arrowH = c * 0.17;
    const arrowTop = c - m - arrowH;
    const hasPicture = layout === 'framed' || icon !== undefined;
    const salary =
        text ??
        t.startSalary(money(space.salary ?? 0), name.trim() || undefined);
    const bands: Band[] = [
        {
            height: c * (hasPicture ? 0.15 : 0.19),
            draw: (box) => (
                <FitText
                    text={salary}
                    {...box}
                    maxFontMm={c * 0.05}
                    minFontMm={2}
                    wrap="words"
                    {...look.figure}
                    align="center"
                    lineHeight={1.15}
                    slot="salary"
                />
            ),
        },
    ];

    if (hasPicture) {
        bands.push(pictureBand(c * 0.24, layout, photo, icon, null, theme.ink));
    }

    bands.push({
        height: c * (hasPicture ? 0.2 : 0.27),
        draw: (box) => (
            <FitText
                text={name}
                {...box}
                maxFontMm={c * (hasPicture ? 0.15 : 0.2)}
                minFontMm={3}
                wrap="words"
                {...look.name}
                align="center"
                lineHeight={1}
                slot="name"
            />
        ),
    });

    return (
        <>
            <DiagonalStack
                bounds={{
                    left: c * 0.06,
                    top: c * 0.06,
                    right: c - m,
                    bottom: arrowTop - c * 0.02,
                }}
                bands={bands}
                gap={c * 0.025}
                shift={-c * 0.01}
                inset={c * 0.02}
            />
            <StartArrow
                x={c * 0.08}
                y={arrowTop}
                w={c - m - c * 0.08}
                h={arrowH}
                color={theme.secondaryAccent}
            />
        </>
    );
}

/** Free Parking and Go to Jail: the name in two lines around a picture, all on the diagonal. */
function PictureCorner({
    space,
    size: c,
    name,
    text,
    layout,
    photo,
    icon,
}: CornerContentProps) {
    const { theme } = useRender();
    const look = useBoardLook();
    const m = edgeMargin(c);
    const [first, second] = splitBalanced(name);
    const lineText = text?.trim() ?? '';
    const nameBand = (line: string, slot: string): Band => ({
        height: c * 0.15,
        draw: (box) => (
            <FitText
                text={line}
                {...box}
                maxFontMm={c * 0.115}
                minFontMm={2.6}
                wrap="words"
                {...look.name}
                align="center"
                lineHeight={1}
                slot={slot}
            />
        ),
    });
    const bands: Band[] = [nameBand(first, 'name')];

    bands.push(
        pictureBand(
            c * (second === '' ? 0.36 : 0.3),
            layout,
            photo,
            icon,
            space.corner === 'parking' ? 'car' : 'cap',
            theme.ink,
        ),
    );

    if (second !== '') {
        bands.push(nameBand(second, 'name-2'));
    }

    if (lineText !== '') {
        bands.push({
            height: c * 0.09,
            draw: (box) => (
                <FitText
                    text={lineText}
                    {...box}
                    maxFontMm={c * 0.045}
                    minFontMm={2}
                    wrap="words"
                    {...look.figure}
                    align="center"
                    slot="text"
                />
            ),
        });
    }

    return (
        <DiagonalStack
            bounds={{
                left: c * 0.05,
                top: c * 0.05,
                right: c - m,
                bottom: c - m,
            }}
            bands={bands}
            gap={c * 0.02}
            shift={lineText === '' ? 0 : c * 0.03}
            inset={c * 0.02}
        />
    );
}

/** The picture in the middle of a corner: the photo, the chosen icon, or our own drawing. */
function pictureBand(
    height: number,
    layout: Layout,
    photo: PhotoSource | undefined,
    icon: SpaceIconSource | undefined,
    drawing: 'car' | 'cap' | null,
    ink: string,
): Band {
    if (layout === 'framed') {
        return {
            height,
            maxWidth: height * 1.5,
            draw: (box) => <PhotoInCorner {...box} photo={photo} />,
        };
    }

    return {
        height,
        draw: (box) =>
            icon !== undefined || drawing === null ? (
                <SpaceIconArt
                    icon={icon}
                    fallback={null}
                    x={-box.h / 2}
                    y={box.y}
                    size={box.h}
                    color={ink}
                    strokeWidth={1.6}
                />
            ) : drawing === 'car' ? (
                <CarArt x={-box.h * 0.8} y={box.y} w={box.h * 1.6} h={box.h} />
            ) : (
                <CapArt x={-box.h * 0.7} y={box.y} w={box.h * 1.4} h={box.h} />
            ),
    };
}

function PhotoInCorner({
    x,
    y,
    w,
    h,
    photo,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    photo?: PhotoSource;
}) {
    const { theme } = useRender();

    return (
        <>
            <PhotoSlot x={x} y={y} w={w} h={h} photo={photo} />
            <Frame
                x={x}
                y={y}
                w={w}
                h={h}
                color={theme.ink}
                strokeMm={theme.frameMm}
            />
        </>
    );
}

function JailCorner({
    size: c,
    name,
    text,
    layout,
    photo,
    icon,
}: CornerContentProps) {
    const { theme, locale } = useRender();
    const look = useBoardLook();
    const t = STRINGS[locale];
    const m = edgeMargin(c);
    const strip = c * 0.3;
    // Vintage keeps its double rule free and Speels its tile edge: the cell moves in from the inner edges (B268).
    const o =
        look.style === 'vintage'
            ? RULE_INSET + 1.35
            : look.style === 'playful'
              ? TILE_GAP + 0.9
              : 0;
    const cellRadius = look.style === 'playful' ? 1.8 : 0;
    const s = c - strip - o;
    const parts = jailNameParts(name, t.justVisiting);
    const { visiting } = parts;
    const [firstLeg, secondLeg] = visitingLegs(visiting);
    const label = text ?? t.inJail;
    // "In jail" over "Jail" says the same twice: then the label alone, large.
    const place = label
        .toLocaleLowerCase()
        .includes(parts.place.toLocaleLowerCase())
        ? ''
        : parts.place;
    const framed = layout === 'framed';
    const cellFill = mix(theme.paper, theme.secondaryAccent, 0.42);
    const line = Math.max(theme.frameMm * 1.6, 0.6);
    const barCount = 4;
    const barW = Math.max(0.7, s * 0.026);
    const plateH = c * (place === '' ? 0.13 : 0.27);
    const pawn = Math.min(strip * 0.62, c * 0.2);
    const plateBounds = {
        left: s * 0.07,
        top: s * 0.07,
        right: s * 0.93,
        bottom: s * 0.93,
    };
    // With a photo the plate moves towards the outer corner of the cell, so a face in the top third stays free.
    const plateShift = framed ? -s * 0.1 : 0;
    const plateCentre = { x: s / 2, y: s / 2 };
    const plateW = Math.max(
        0,
        diagonalBandWidth(plateBounds, plateCentre, plateShift, plateH) -
            c * 0.02,
    );
    const legH = strip - m - c * 0.04;

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: mm(o),
                    top: mm(o),
                    width: mm(s),
                    height: mm(s),
                    borderRadius: mm(cellRadius),
                    overflow: cellRadius > 0 ? 'hidden' : undefined,
                }}
            >
                <Abs
                    x={0}
                    y={0}
                    w={s}
                    h={s}
                    style={{ background: cellFill }}
                    slot="cell"
                />
                {framed && <PhotoSlot x={0} y={0} w={s} h={s} photo={photo} />}
                <svg
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: mm(s),
                        height: mm(s),
                    }}
                    viewBox={`0 0 ${String(s)} ${String(s)}`}
                    aria-hidden="true"
                    data-slot="bars"
                >
                    {Array.from({ length: barCount }, (_, index) => {
                        const x = (s / (barCount + 1)) * (index + 1);

                        return (
                            <rect
                                key={index}
                                x={x - barW / 2}
                                y={0}
                                width={barW}
                                height={s}
                                rx={barW / 2}
                                fill={theme.ink}
                            />
                        );
                    })}
                    <rect
                        x={0}
                        y={s * 0.1 - barW / 2}
                        width={s}
                        height={barW}
                        fill={theme.ink}
                    />
                    <rect
                        x={0}
                        y={s * 0.9 - barW / 2}
                        width={s}
                        height={barW}
                        fill={theme.ink}
                    />
                </svg>
                <Frame
                    x={0}
                    y={0}
                    w={s}
                    h={s}
                    color={theme.ink}
                    strokeMm={line}
                    radiusMm={cellRadius}
                />
                <Turned
                    x={plateCentre.x}
                    y={plateCentre.y}
                    angle={CORNER_TEXT_ANGLE}
                >
                    <Abs
                        x={-plateW / 2}
                        y={-plateShift - plateH / 2}
                        w={plateW}
                        h={plateH}
                        style={{
                            background: theme.paper,
                            borderRadius: mm(c * 0.015),
                        }}
                        slot="plate"
                    />
                    <Frame
                        x={-plateW / 2}
                        y={-plateShift - plateH / 2}
                        w={plateW}
                        h={plateH}
                        color={theme.ink}
                        strokeMm={theme.frameMm}
                        radiusMm={c * 0.015}
                        ornate
                    />
                    <FitText
                        text={label}
                        x={-plateW / 2 + c * 0.03}
                        y={-plateShift - plateH / 2 + c * 0.02}
                        w={plateW - c * 0.06}
                        h={place === '' ? plateH - c * 0.04 : c * 0.075}
                        maxFontMm={c * (place === '' ? 0.08 : 0.05)}
                        minFontMm={2}
                        {...(place === ''
                            ? look.name
                            : look.style === undefined
                              ? { font: 'body', weight: 700 }
                              : look.figure)}
                        align="center"
                        slot="in-jail"
                    />
                    {place !== '' && (
                        <FitText
                            text={place}
                            x={-plateW / 2 + c * 0.03}
                            y={-plateShift - plateH / 2 + c * 0.095}
                            w={plateW - c * 0.06}
                            h={plateH - c * 0.115}
                            maxFontMm={c * 0.085}
                            minFontMm={2.2}
                            wrap="words"
                            {...look.name}
                            align="center"
                            lineHeight={1}
                            slot="name"
                        />
                    )}
                </Turned>
            </div>
            {firstLeg !== '' && (
                <FitText
                    text={firstLeg}
                    x={o + c * 0.04}
                    y={o + s + c * 0.02}
                    w={s - c * 0.06}
                    h={legH}
                    maxFontMm={c * 0.12}
                    minFontMm={2.2}
                    {...look.name}
                    align="center"
                    lineHeight={1}
                    slot="visiting"
                />
            )}
            {secondLeg !== '' && (
                <Turned
                    x={o + s + strip / 2 - (m - c * 0.02) / 2}
                    y={o + s / 2}
                    angle={-90}
                >
                    <FitText
                        text={secondLeg}
                        x={-(s - c * 0.06) / 2}
                        y={-legH / 2}
                        w={s - c * 0.06}
                        h={legH}
                        maxFontMm={c * 0.12}
                        minFontMm={2.2}
                        {...look.name}
                        align="center"
                        lineHeight={1}
                        slot="visiting-2"
                    />
                </Turned>
            )}
            <Turned
                x={o + s + (strip - m + c * 0.02) / 2}
                y={o + s + (strip - m + c * 0.02) / 2}
                angle={CORNER_TEXT_ANGLE}
            >
                {icon !== undefined ? (
                    <SpaceIconArt
                        icon={icon}
                        fallback={null}
                        x={-pawn / 2}
                        y={-pawn / 2}
                        size={pawn}
                        color={theme.ink}
                        strokeWidth={1.6}
                    />
                ) : (
                    <PawnArt x={-pawn / 2} y={-pawn / 2} size={pawn} />
                )}
            </Turned>
        </>
    );
}

/** The long arrow of Start along the outer edge, pointing the way the game goes. */
function StartArrow({
    x,
    y,
    w,
    h,
    color,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
}) {
    const head = h * 0.95;
    const shaft = h * 0.4;
    const top = (h - shaft) / 2;
    const d = [
        `M0 ${h / 2}`,
        `L${head} 0`,
        `L${head} ${top}`,
        `L${w} ${top}`,
        `L${w} ${top + shaft}`,
        `L${head} ${top + shaft}`,
        `L${head} ${h}`,
        'Z',
    ].join(' ');

    return (
        <svg
            style={{
                position: 'absolute',
                left: mm(x),
                top: mm(y),
                width: mm(w),
                height: mm(h),
                overflow: 'visible',
            }}
            viewBox={`0 0 ${String(w)} ${String(h)}`}
            aria-hidden="true"
            data-slot="start-arrow"
        >
            <path
                d={d}
                fill={color}
                stroke={color}
                strokeWidth={h * 0.06}
                strokeLinejoin="round"
            />
        </svg>
    );
}

function Drawing({
    x,
    y,
    w,
    h,
    viewBox,
    slot,
    children,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    viewBox: string;
    slot: string;
    children: ReactNode;
}) {
    return (
        <svg
            style={{
                position: 'absolute',
                left: mm(x),
                top: mm(y),
                width: mm(w),
                height: mm(h),
                overflow: 'visible',
            }}
            viewBox={viewBox}
            aria-hidden="true"
            data-slot={slot}
        >
            {children}
        </svg>
    );
}

/** Go to Jail: a peaked police cap with a coloured band and a badge, our own drawing. */
function CapArt({
    x,
    y,
    w,
    h,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
}) {
    const { theme } = useRender();
    const ink = theme.ink;
    const paper = theme.paper;

    return (
        <Drawing x={x} y={y} w={w} h={h} viewBox="0 0 42 30" slot="cap">
            <path
                d="M2.5 12.5C2.5 6.6 10.8 2.6 21 2.6s18.5 4 18.5 9.9L34 18H8z"
                fill={ink}
                stroke={ink}
                strokeWidth={1}
                strokeLinejoin="round"
            />
            <path
                d="M7 9.4C9.4 6.6 13.4 5 17.6 4.6"
                fill="none"
                stroke={paper}
                strokeOpacity={0.45}
                strokeWidth={1.1}
                strokeLinecap="round"
            />
            <rect
                x={8}
                y={18}
                width={26}
                height={5}
                fill={theme.secondaryAccent}
                stroke={ink}
                strokeWidth={1}
            />
            <path
                d="M9 20.5h24"
                stroke={paper}
                strokeWidth={0.5}
                strokeDasharray="1.6 1.2"
            />
            <path
                d="M6 23h30c-1 3.8-7 6-15 6S7 26.8 6 23z"
                fill={ink}
                stroke={ink}
                strokeWidth={1}
                strokeLinejoin="round"
            />
            <path
                d="M21 6.2l4.2 1.6v3.7c0 2.6-1.8 4.4-4.2 5.2-2.4-.8-4.2-2.6-4.2-5.2V7.8z"
                fill={paper}
                stroke={ink}
                strokeWidth={0.6}
                strokeLinejoin="round"
            />
            <path
                d="M21 8.6l.8 1.6 1.7.2-1.3 1.2.4 1.7-1.6-.9-1.6.9.4-1.7-1.3-1.2 1.7-.2z"
                fill={theme.secondaryAccent}
            />
        </Drawing>
    );
}

/** Free Parking: a small round car in the second colour of the theme. */
function CarArt({
    x,
    y,
    w,
    h,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
}) {
    const { theme } = useRender();
    const ink = theme.ink;
    const paper = theme.paper;

    return (
        <Drawing x={x} y={y} w={w} h={h} viewBox="0 0 40 25" slot="car">
            <path
                d="M3 16c0-2 1-2.9 3-3.3l4.6-.8 4.2-5.4c.8-1 1.8-1.5 3.1-1.5h7.6c1.4 0 2.4.5 3.2 1.6l3.6 4.8 3.2.7c1.6.4 2.3 1.4 2.3 3.1v2.8c0 .8-.6 1.4-1.4 1.4H4.4c-.8 0-1.4-.6-1.4-1.4z"
                fill={theme.secondaryAccent}
                stroke={ink}
                strokeWidth={1.2}
                strokeLinejoin="round"
            />
            <path
                d="M15.8 11.6l2.6-3.8h3.1v3.8zM23.3 11.6V7.8h2.5c.6 0 1 .2 1.4.7l2.4 3.1z"
                fill={paper}
                stroke={ink}
                strokeWidth={0.9}
                strokeLinejoin="round"
            />
            <path
                d="M34.6 14.2h2.2"
                stroke={paper}
                strokeWidth={1.4}
                strokeLinecap="round"
            />
            <path
                d="M3.4 16.6h2.4"
                stroke={ink}
                strokeWidth={1}
                strokeLinecap="round"
            />
            {[11, 29.5].map((cx) => (
                <g key={cx}>
                    <circle cx={cx} cy={19.6} r={3.7} fill={ink} />
                    <circle cx={cx} cy={19.6} r={1.4} fill={paper} />
                </g>
            ))}
        </Drawing>
    );
}

/** The visitor in the outer square of the jail corner: a pawn, as on the box lid. */
function PawnArt({ x, y, size }: { x: number; y: number; size: number }) {
    const { theme } = useRender();

    return (
        <Drawing
            x={x + size * 0.1}
            y={y}
            w={size * 0.8}
            h={size}
            viewBox="0 0 20 25"
            slot="pawn"
        >
            <circle
                cx={10}
                cy={5.6}
                r={3.8}
                fill={theme.secondaryAccent}
                stroke={theme.ink}
                strokeWidth={1}
            />
            <path
                d="M6.6 10h6.8l-.9 1.6c.2 3.6 1.5 6.2 3.5 8H4c2-1.8 3.3-4.4 3.5-8z"
                fill={theme.secondaryAccent}
                stroke={theme.ink}
                strokeWidth={1}
                strokeLinejoin="round"
            />
            <rect
                x={3}
                y={19.6}
                width={14}
                height={3.6}
                rx={1.2}
                fill={theme.secondaryAccent}
                stroke={theme.ink}
                strokeWidth={1}
            />
        </Drawing>
    );
}
