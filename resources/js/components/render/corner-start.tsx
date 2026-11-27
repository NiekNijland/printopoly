import { STRINGS } from '@/lib/render/strings';
import { mm } from '@/lib/render/units';

import { useBoardLook } from './board-look';
import type { CornerContentProps } from './corner-content';
import { DiagonalStack, edgeMargin, type Band } from './corner-diagonal';
import { pictureBand } from './corner-picture';
import { FitText } from './fit-text';
import { useRender } from './sheet';

const nameBand = (
    c: number,
    hasPicture: boolean,
    name: string,
    look: ReturnType<typeof useBoardLook>,
): Band => ({
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

export const StartCorner = ({
    space,
    size: c,
    name,
    text,
    layout,
    photo,
    icon,
    money,
}: CornerContentProps) => {
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

    bands.push(nameBand(c, hasPicture, name, look));

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
};

/** The long arrow of Start along the outer edge, pointing the way the game goes. */
const StartArrow = ({
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
}) => {
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
};
