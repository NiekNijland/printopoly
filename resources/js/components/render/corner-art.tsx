import type { ReactNode } from 'react';

import { mm } from '@/lib/render/units';

import { useRender } from './sheet';

const Drawing = ({
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
}) => {
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
};

/** Go to Jail: a peaked police cap with a coloured band and a badge, our own drawing. */
export const CapArt = ({
    x,
    y,
    w,
    h,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
}) => {
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
};

/** Free Parking: a small round car in the second colour of the theme. */
export const CarArt = ({
    x,
    y,
    w,
    h,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
}) => {
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
};

/** The visitor in the outer square of the jail corner: a pawn, as on the box lid. */
export const PawnArt = ({
    x,
    y,
    size,
}: {
    x: number;
    y: number;
    size: number;
}) => {
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
};
