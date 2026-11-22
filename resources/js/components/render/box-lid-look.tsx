import type { CSSProperties } from 'react';

import type { BoxLidStyle } from '@/lib/edition/part-styles';
import { standardEdition } from '@/lib/game/standard-edition';
import type { GroupId } from '@/lib/game/types';
import type { Rect } from '@/lib/print/types';
import { mix, withAlpha } from '@/lib/render/color';
import type { Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { Hatch, ruleColor } from './board-look';
import {
    Art,
    ConfettiShape,
    Rope,
    Rosette,
    blockColor,
    diamond,
    scallopedRect,
    scatter,
    vintagePaper,
} from './piece-styles';
import { Abs, Frame, useRender } from './sheet';

/**
 * The frame, background and decoration of the box lid in its style (B271), around the name plate, which keeps the
 * title style of B265. Every style stays outside the text areas of `lidLayout`, so the check on free layers (bug 36)
 * and the measured photo frame are the same in every style.
 *
 * - Vintage: cream, a banknote border (a rule, a rope of three waves, a rule) with a guilloche rosette in each
 *   corner and a lozenge in the middle of each side.
 * - Modern: no frame; a quarter disc in the two top corners and the street colours as a wide band of blocks
 *   along the bottom edge, the board straight on a flat offset block.
 * - Speels: a scalloped paper doily on the lid colour, a stitched line inside it, tape on the board and confetti
 *   beside it.
 */

/** The street colours of the edition: its own colours, else the theme's (B256). */
function useStreetColors(): string[] {
    const { theme, style } = useRender();
    const colour = (id: GroupId, standard: string): string =>
        style?.groupColors?.[id] ?? theme.groupColors?.[id] ?? standard;

    return standardEdition.groups.map((group) => colour(group.id, group.color));
}

/** The colour of a Vintage lid: the lid colour of the theme, warmed to cream. */
export function vintageLid(theme: Theme): string {
    return vintagePaper(theme.boardBackground, 0.55);
}

/** The background of the lid under everything: cream for Vintage, bleed included. */
export function LidBackground({
    look,
    w,
    h,
    bleed,
}: {
    look: BoxLidStyle | undefined;
    w: number;
    h: number;
    bleed: number;
}) {
    const { theme } = useRender();

    if (look !== 'vintage') {
        return null;
    }

    return (
        <Abs
            x={-bleed}
            y={-bleed}
            w={w + 2 * bleed}
            h={h + 2 * bleed}
            style={{ background: vintageLid(theme) }}
            slot="lid-paper"
        />
    );
}

/** The frame of a lid with paper around its content (no photo over the whole lid). */
export function LidFrame({
    look,
    w,
    h,
    bleed,
}: {
    look: BoxLidStyle | undefined;
    w: number;
    h: number;
    bleed: number;
}) {
    const { theme } = useRender();

    switch (look) {
        case 'vintage':
            return <VintageBorder w={w} h={h} />;
        case 'modern':
            return <ModernCorners w={w} h={h} bleed={bleed} />;
        case 'playful':
            return <PlayfulDoily w={w} h={h} />;
        case undefined:
            return (
                <Frame
                    ornate
                    x={6}
                    y={6}
                    w={w - 12}
                    h={h - 12}
                    color={
                        theme.ornament === undefined ? theme.ink : theme.accent
                    }
                    strokeMm={theme.frameMm + 0.2}
                />
            );
    }
}

/** The sizes of the banknote border, in mm from the edge of the lid. */
const BORDER = {
    outer: 4.2,
    outerHair: 4.9,
    bandFrom: 5.5,
    bandTo: 9.5,
    innerHair: 10.1,
    inner: 10.8,
} as const;

/** Vintage: the border of an engraved banknote. */
function VintageBorder({ w, h }: { w: number; h: number }) {
    const { theme } = useRender();
    const color = ruleColor(theme);
    const paper = vintageLid(theme);
    const band = BORDER.bandTo - BORDER.bandFrom;
    const rect = (inset: number, stroke: number) => (
        <rect
            x={inset}
            y={inset}
            width={w - 2 * inset}
            height={h - 2 * inset}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
        />
    );
    const box = BORDER.inner - BORDER.outer;
    const corners: [number, number][] = [
        [BORDER.outer, BORDER.outer],
        [w - BORDER.inner, BORDER.outer],
        [w - BORDER.inner, h - BORDER.inner],
        [BORDER.outer, h - BORDER.inner],
    ];
    const lozenge = 3.6;
    const middles: [number, number][] = [
        [w / 2, (BORDER.bandFrom + BORDER.bandTo) / 2],
        [w / 2, h - (BORDER.bandFrom + BORDER.bandTo) / 2],
        [(BORDER.bandFrom + BORDER.bandTo) / 2, h / 2],
        [w - (BORDER.bandFrom + BORDER.bandTo) / 2, h / 2],
    ];

    return (
        <Art x={0} y={0} w={w} h={h} slot="lid-border">
            {rect(BORDER.outer, 0.45)}
            {rect(BORDER.outerHair, 0.14)}
            {/* The rope along the four sides; the corner boxes cover where they meet. */}
            {[
                `translate(${String(BORDER.bandFrom)} ${String(BORDER.bandFrom)})`,
                `translate(${String(BORDER.bandFrom)} ${String(h - BORDER.bandTo)})`,
            ].map((transform) => (
                <g key={transform} transform={transform}>
                    <Rope
                        length={w - 2 * BORDER.bandFrom}
                        band={band}
                        color={color}
                    />
                </g>
            ))}
            {[
                `translate(${String(BORDER.bandTo)} ${String(BORDER.bandFrom)}) rotate(90)`,
                `translate(${String(w - BORDER.bandFrom)} ${String(BORDER.bandFrom)}) rotate(90)`,
            ].map((transform) => (
                <g key={transform} transform={transform}>
                    <Rope
                        length={h - 2 * BORDER.bandFrom}
                        band={band}
                        color={color}
                    />
                </g>
            ))}
            {rect(BORDER.innerHair, 0.14)}
            {rect(BORDER.inner, 0.35)}
            {corners.map(([x, y]) => (
                <g key={`${String(x)}-${String(y)}`} data-slot="lid-corner">
                    <rect
                        x={x}
                        y={y}
                        width={box}
                        height={box}
                        fill={paper}
                        stroke={color}
                        strokeWidth={0.35}
                    />
                    <rect
                        x={x + 0.6}
                        y={y + 0.6}
                        width={box - 1.2}
                        height={box - 1.2}
                        fill="none"
                        stroke={color}
                        strokeWidth={0.12}
                    />
                    <Rosette
                        cx={x + box / 2}
                        cy={y + box / 2}
                        r={box / 2 - 1.2}
                        color={color}
                    />
                </g>
            ))}
            {middles.map(([cx, cy]) => (
                <g key={`${String(cx)}-${String(cy)}`}>
                    <path
                        d={diamond(cx, cy, lozenge)}
                        fill={paper}
                        stroke={color}
                        strokeWidth={0.35}
                    />
                    <path
                        d={diamond(cx, cy, lozenge - 0.9)}
                        fill="none"
                        stroke={color}
                        strokeWidth={0.12}
                    />
                    <path d={diamond(cx, cy, 0.8)} fill={color} />
                </g>
            ))}
        </Art>
    );
}

/** Modern: a quarter disc in each top corner, bleeding off the edge. */
function ModernCorners({
    w,
    h,
    bleed,
}: {
    w: number;
    h: number;
    bleed: number;
}) {
    const { theme } = useRender();
    const r = Math.min(w, h) * 0.1;

    return (
        <Art
            x={-bleed}
            y={-bleed}
            w={w + 2 * bleed}
            h={h + 2 * bleed}
            slot="lid-discs"
            clip
        >
            <circle
                cx={bleed}
                cy={bleed}
                r={r + bleed}
                fill={blockColor(theme)}
            />
            <circle
                cx={w + bleed}
                cy={bleed}
                r={r * 0.62 + bleed}
                fill={theme.deckAccent.chance}
            />
        </Art>
    );
}

/** Speels: a paper doily with a scalloped edge and a stitched line, on the colour of the lid. */
function PlayfulDoily({ w, h }: { w: number; h: number }) {
    const { theme } = useRender();
    const edge = 7.4;
    const size = 7;
    const stitch = 10;

    return (
        <Art x={0} y={0} w={w} h={h} slot="lid-doily">
            <path
                d={scallopedRect(edge, edge, w - 2 * edge, h - 2 * edge, size)}
                fill={theme.paper}
                stroke={theme.ink}
                strokeWidth={0.5}
                strokeLinejoin="round"
            />
            <rect
                x={stitch}
                y={stitch}
                width={w - 2 * stitch}
                height={h - 2 * stitch}
                rx={4}
                fill="none"
                stroke={blockColor(theme)}
                strokeWidth={0.5}
                strokeDasharray="2.2 1.6"
                strokeLinecap="round"
            />
        </Art>
    );
}

/** The frame on a photo over the whole lid: the theme's line, a double rule with diamonds, none, or a stitch. */
export function FullPhotoFrame({
    look,
    w,
    h,
}: {
    look: BoxLidStyle | undefined;
    w: number;
    h: number;
}) {
    const { theme } = useRender();
    const paper = theme.paper;

    switch (look) {
        case 'vintage':
            return (
                <Art x={0} y={0} w={w} h={h} slot="lid-border">
                    {[
                        [5, 0.5],
                        [6.2, 0.18],
                    ].map(([inset = 0, stroke = 0]) => (
                        <rect
                            key={inset}
                            x={inset}
                            y={inset}
                            width={w - 2 * inset}
                            height={h - 2 * inset}
                            fill="none"
                            stroke={paper}
                            strokeWidth={stroke}
                        />
                    ))}
                    {[
                        [5, 5],
                        [w - 5, 5],
                        [w - 5, h - 5],
                        [5, h - 5],
                    ].map(([cx = 0, cy = 0]) => (
                        <path
                            key={`${String(cx)}-${String(cy)}`}
                            d={diamond(cx, cy, 2)}
                            fill={paper}
                        />
                    ))}
                </Art>
            );
        case 'modern':
            return null;
        case 'playful':
            return (
                <Art x={0} y={0} w={w} h={h} slot="lid-stitch">
                    <rect
                        x={7}
                        y={7}
                        width={w - 14}
                        height={h - 14}
                        rx={5}
                        fill="none"
                        stroke={paper}
                        strokeWidth={0.9}
                        strokeDasharray="3 2.2"
                        strokeLinecap="round"
                    />
                </Art>
            );
        case undefined:
            return (
                <Frame
                    x={6}
                    y={6}
                    w={w - 12}
                    h={h - 12}
                    color={paper}
                    strokeMm={theme.frameMm + 0.2}
                />
            );
    }
}

/** The band under the name on a photo over the whole lid, in the style. */
export function bandStyle(
    look: BoxLidStyle | undefined,
    theme: Theme,
    opacity: number,
): { inset: number; style: CSSProperties } {
    switch (look) {
        case 'vintage':
            return {
                inset: 0,
                style: {
                    background: withAlpha(vintagePaper(theme.paper), opacity),
                    borderTop: `${mm(1.2)} double ${ruleColor(theme)}`,
                    borderBottom: `${mm(1.2)} double ${ruleColor(theme)}`,
                    boxSizing: 'border-box',
                },
            };
        case 'modern':
            return {
                inset: 0,
                style: {
                    background: withAlpha(theme.paper, opacity),
                    borderTop: `${mm(2.4)} solid ${blockColor(theme)}`,
                    boxSizing: 'border-box',
                },
            };
        case 'playful':
            return {
                inset: 9,
                style: {
                    background: withAlpha(theme.paper, opacity),
                    borderRadius: mm(8),
                    border: `${mm(0.5)} solid ${theme.ink}`,
                    boxSizing: 'border-box',
                },
            };
        case undefined:
            return {
                inset: 0,
                style: { background: withAlpha(theme.paper, opacity) },
            };
    }
}

/** The street colours along the bottom of a lid without an own photo (B256), in the style. */
export function LidStrip({
    look,
    rect,
    w,
    h,
    bleed,
}: {
    look: BoxLidStyle | undefined;
    rect: Rect;
    w: number;
    h: number;
    bleed: number;
}) {
    const { theme } = useRender();
    const colors = useStreetColors();

    if (look === 'modern') {
        // A wide band of flat blocks from the strip to the edge, bleed included.
        return <ModernBand y={rect.y} w={w} h={h} bleed={bleed} />;
    }

    const gap = look === 'playful' ? 1.6 : 1;

    return (
        <Abs
            {...rect}
            style={{ display: 'flex', gap: mm(gap) }}
            slot="lid-strip"
        >
            {colors.map((color, index) => (
                <span
                    key={index}
                    style={{
                        position: 'relative',
                        flex: 1,
                        background: color,
                        ...(look === 'playful'
                            ? {
                                  borderRadius: mm(rect.h / 2),
                                  border: `${mm(0.35)} solid ${theme.ink}`,
                              }
                            : {}),
                        ...(look === 'vintage'
                            ? {
                                  outline: `${mm(0.15)} solid ${ruleColor(theme)}`,
                                  outlineOffset: mm(0.35),
                              }
                            : {}),
                    }}
                >
                    {look === 'vintage' && (
                        <Hatch
                            x={0}
                            y={0}
                            w={(rect.w - 7 * gap) / 8}
                            h={rect.h}
                            color="#FFFFFF"
                            spacing={0.7}
                            opacity={0.5}
                        />
                    )}
                </span>
            ))}
        </Abs>
    );
}

/** Modern: the street colours as a band of flat blocks along the bottom edge, bleed included. */
export function ModernBand({
    y,
    w,
    h,
    bleed,
}: {
    y: number;
    w: number;
    h: number;
    bleed: number;
}) {
    const colors = useStreetColors();

    return (
        <Abs
            x={-bleed}
            y={y}
            w={w + 2 * bleed}
            h={h - y + bleed}
            style={{ display: 'flex' }}
            slot="lid-strip"
        >
            {colors.map((color, index) => (
                <span key={index} style={{ flex: 1, background: color }} />
            ))}
        </Abs>
    );
}

/** Speels: confetti beside the board picture, in the gutters between the stitch and the board. */
export function LidConfetti({
    picture,
    w,
    h,
}: {
    picture: Rect;
    w: number;
    h: number;
}) {
    const { theme } = useRender();
    const streets = useStreetColors();
    const colors = [
        blockColor(theme),
        ...streets,
        theme.deckAccent.chance,
        theme.deckAccent.chest,
    ];
    const gutter = picture.x - 13 - 9;
    if (gutter < 8) {
        return null;
    }
    const unit = Math.min(w, h) / 267;
    const size = 6 * unit;
    const count = Math.max(
        5,
        Math.round((gutter * picture.h) / (420 * unit * unit)),
    );
    const box = (x: number) => ({
        x,
        y: picture.y + 3,
        w: gutter,
        h: picture.h - 6,
    });
    const pieces = [
        ...scatter(11, box(13), count, size, colors),
        ...scatter(29, box(w - 13 - gutter), count, size, colors),
    ];

    return (
        <Art x={0} y={0} w={w} h={h} slot="confetti">
            {pieces.map((piece, index) => (
                <ConfettiShape key={index} piece={piece} />
            ))}
        </Art>
    );
}

/** Speels: two strips of tape over the top corners of the board picture or the photo. */
export function TapeCorners({ w, h }: { w: number; h: number }) {
    const { theme } = useRender();
    const tapeW = Math.min(26, Math.max(12, w * 0.14));
    const tapeH = tapeW * 0.3;
    const fill = withAlpha(mix(theme.paper, theme.secondaryAccent, 0.45), 0.8);
    const piece = (x: number, turn: number) => (
        <Abs
            x={x - tapeW / 2}
            y={-tapeH / 2 + tapeW * 0.08}
            w={tapeW}
            h={tapeH}
            slot="tape"
            style={{
                background: fill,
                transform: `rotate(${String(turn)}deg)`,
            }}
        />
    );

    return (
        <Abs x={0} y={0} w={w} h={h}>
            {piece(tapeW * 0.18, -40)}
            {piece(w - tapeW * 0.18, 40)}
        </Abs>
    );
}

/** Vintage: an engraved mat of two rules around a framed photo, the inner one over the photo in paper. */
export function PhotoMat({
    look,
    rect,
}: {
    look: BoxLidStyle | undefined;
    rect: Rect;
}) {
    const { theme } = useRender();

    if (look === 'vintage') {
        return (
            <Art {...rect} slot="photo-edge">
                <rect
                    x={0.2}
                    y={0.2}
                    width={rect.w - 0.4}
                    height={rect.h - 0.4}
                    fill="none"
                    stroke={ruleColor(theme)}
                    strokeWidth={0.4}
                />
                <rect
                    x={2}
                    y={2}
                    width={rect.w - 4}
                    height={rect.h - 4}
                    fill="none"
                    stroke={theme.paper}
                    strokeWidth={0.25}
                />
            </Art>
        );
    }

    if (look === 'playful') {
        return (
            <>
                <Art {...rect} slot="photo-edge">
                    <rect
                        x={0.25}
                        y={0.25}
                        width={rect.w - 0.5}
                        height={rect.h - 0.5}
                        rx={6}
                        fill="none"
                        stroke={theme.ink}
                        strokeWidth={0.5}
                    />
                </Art>
                <Abs {...rect}>
                    <TapeCorners w={rect.w} h={rect.h} />
                </Abs>
            </>
        );
    }

    return null;
}

/** Modern: a flat block in the strong colour of the theme, offset behind a photo or the board. */
export function OffsetBlock({ rect }: { rect: Rect }) {
    const { theme } = useRender();
    const offset = Math.min(4, Math.max(2.5, rect.w * 0.015));

    return (
        <Abs
            x={rect.x + offset}
            y={rect.y + offset}
            w={rect.w}
            h={rect.h}
            slot="offset-block"
            style={{ background: blockColor(theme) }}
        />
    );
}
