import type { CSSProperties } from 'react';

import { withAlpha } from '@/lib/render/color';
import type { BoxLidStyle } from '@/lib/render/edition-part-styles';
import type { Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import type { Rect } from '@/types/print';

import { ruleColor } from './board-look';
import { Hatch } from './board-look-vintage';
import { useStreetColors, vintageLid } from './box-lid-colors';
import { ModernBand, ModernCorners } from './box-lid-look-modern';
import { PlayfulDoily, TapeCorners } from './box-lid-look-playful';
import { VintageBorder } from './box-lid-look-vintage';
import { Art, blockColor, diamond, vintagePaper } from './piece-styles';
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

/** The background of the lid under everything: cream for Vintage, bleed included. */
export const LidBackground = ({
    look,
    w,
    h,
    bleed,
}: {
    look: BoxLidStyle | undefined;
    w: number;
    h: number;
    bleed: number;
}) => {
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
};

/** The frame of a lid with paper around its content (no photo over the whole lid). */
export const LidFrame = ({
    look,
    w,
    h,
    bleed,
}: {
    look: BoxLidStyle | undefined;
    w: number;
    h: number;
    bleed: number;
}) => {
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
};

/** The frame on a photo over the whole lid: the theme's line, a double rule with diamonds, none, or a stitch. */
export const FullPhotoFrame = ({
    look,
    w,
    h,
}: {
    look: BoxLidStyle | undefined;
    w: number;
    h: number;
}) => {
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
};

/** The band under the name on a photo over the whole lid, in the style. */
export const bandStyle = (
    look: BoxLidStyle | undefined,
    theme: Theme,
    opacity: number,
): { inset: number; style: CSSProperties } => {
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
};

/** The street colours along the bottom of a lid without an own photo (B256), in the style. */
export const LidStrip = ({
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
}) => {
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
};

/** Vintage: an engraved mat of two rules around a framed photo, the inner one over the photo in paper. */
export const PhotoMat = ({
    look,
    rect,
}: {
    look: BoxLidStyle | undefined;
    rect: Rect;
}) => {
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
};
