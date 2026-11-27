import type { ReactNode } from 'react';

import {
    CORNER_TEXT_ANGLE,
    diagonalBandWidth,
    type Bounds,
} from '@/lib/render/corner-layout';
import { mm } from '@/lib/render/units';

/** Margin to the outer edges, which are the cut edge of the board: never closer than 3 mm. */
export const edgeMargin = (c: number): number => {
    return Math.max(3, c * 0.05);
};

/** A box turned around a point, for content on the diagonal; children are placed around (0, 0). */
export const Turned = ({
    x,
    y,
    angle,
    children,
}: {
    x: number;
    y: number;
    angle: number;
    children: ReactNode;
}) => {
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
};

export type Band = {
    height: number;
    /** Draws the band in a box centred on (0, 0) in the turned frame: `x = -w / 2`, `y` from the top. */
    draw: (box: { x: number; y: number; w: number; h: number }) => ReactNode;
    /** Width cap of the band, for pictures that look odd when stretched. */
    maxWidth?: number;
};

/**
 * Bands stacked on the diagonal, from the inner point to the outer corner, each as wide as the square allows at
 * its height. `shift` moves the whole stack towards the inner point (positive) or the outer corner (negative).
 */
export const DiagonalStack = ({
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
}) => {
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
};
