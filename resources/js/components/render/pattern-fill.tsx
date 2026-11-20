import { useId, type ReactNode } from 'react';

import { PATTERN_TILE_MM, type PatternId } from '@/lib/render/patterns';
import { mm } from '@/lib/render/units';

const T = PATTERN_TILE_MM;

/** The shapes of one tile of a pattern, in a box of `PATTERN_TILE_MM` mm. */
function tile(id: PatternId, color: string): ReactNode {
    switch (id) {
        case 'dots':
            return <circle cx={T / 2} cy={T / 2} r={0.65} fill={color} />;
        case 'stripes':
            return (
                <path
                    d={`M0 ${T} L${T} 0 M-1 1 L1 -1 M${T - 1} ${T + 1} L${T + 1} ${T - 1}`}
                    stroke={color}
                    strokeWidth={0.8}
                    fill="none"
                />
            );
        case 'checks':
            return (
                <>
                    <rect width={T / 2} height={T / 2} fill={color} />
                    <rect
                        x={T / 2}
                        y={T / 2}
                        width={T / 2}
                        height={T / 2}
                        fill={color}
                    />
                </>
            );
        case 'waves':
            return (
                <path
                    d={`M0 ${T / 2} Q${T / 4} ${T / 6} ${T / 2} ${T / 2} T${T} ${T / 2}`}
                    stroke={color}
                    strokeWidth={0.6}
                    fill="none"
                />
            );
        case 'diamonds':
            return (
                <path
                    d={`M${T / 2} 0.6 L${T - 0.6} ${T / 2} L${T / 2} ${T - 0.6} L0.6 ${T / 2} Z`}
                    stroke={color}
                    strokeWidth={0.5}
                    fill="none"
                />
            );
        case 'grid':
            return (
                <path
                    d={`M0 0 H${T} M0 0 V${T}`}
                    stroke={color}
                    strokeWidth={0.35}
                    fill="none"
                />
            );
        case 'rings':
            return (
                <circle
                    cx={T / 2}
                    cy={T / 2}
                    r={2}
                    stroke={color}
                    strokeWidth={0.5}
                    fill="none"
                />
            );
        case 'confetti':
            return (
                <>
                    <rect
                        x={0.8}
                        y={1}
                        width={1.6}
                        height={0.55}
                        fill={color}
                        transform="rotate(30 1.6 1.3)"
                    />
                    <circle cx={4.6} cy={1.8} r={0.5} fill={color} />
                    <rect
                        x={2.2}
                        y={4}
                        width={0.55}
                        height={1.6}
                        fill={color}
                        transform="rotate(-25 2.5 4.8)"
                    />
                    <circle cx={5} cy={4.6} r={0.35} fill={color} />
                </>
            );
    }
}

export interface PatternFillProps {
    id: PatternId;
    /** Size of the area in mm. */
    w: number;
    h: number;
    color: string;
    /** Offset of the tiling in mm, so a pattern lines up across pieces of one artwork. */
    originX?: number;
    originY?: number;
}

/** A pattern repeated over an area, as vector shapes (it stays sharp at any print size). */
export function PatternFill({
    id,
    w,
    h,
    color,
    originX = 0,
    originY = 0,
}: PatternFillProps) {
    const uid = `pt${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
        <svg
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: mm(w),
                height: mm(h),
            }}
            viewBox={`0 0 ${w} ${h}`}
            aria-hidden="true"
            data-pattern={id}
        >
            <defs>
                <pattern
                    id={uid}
                    x={originX}
                    y={originY}
                    width={T}
                    height={T}
                    patternUnits="userSpaceOnUse"
                >
                    {tile(id, color)}
                </pattern>
            </defs>
            <rect width={w} height={h} fill={`url(#${uid})`} />
        </svg>
    );
}
