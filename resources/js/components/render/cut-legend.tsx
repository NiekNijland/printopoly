import { A4, TAB_FILL } from '@/lib/print/extras';
import type { Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { useRender } from './sheet';

/**
 * The strip at the foot of a cut-and-fold sheet: what the three kinds of line mean, and which sheet this is
 * (B123). It sits inside the margin, so a home printer that cannot print to the edge still shows it.
 */
export function CutLegend({
    theme,
    label,
}: {
    theme: Theme;
    /** Right-hand text, such as `Houses · sheet 1/2`. */
    label: string;
}) {
    const { locale } = useRender();
    const words =
        locale === 'nl'
            ? { cut: 'knippen', fold: 'vouwen', glue: 'lijmen' }
            : { cut: 'cut', fold: 'fold', glue: 'glue' };
    const y = A4.h - 11;
    const items = [
        { x: 12, label: words.cut },
        { x: 62, label: words.fold },
        { x: 112, label: words.glue },
    ];

    return (
        <>
            <svg
                width={mm(A4.w)}
                height={mm(A4.h)}
                viewBox={`0 0 ${String(A4.w)} ${String(A4.h)}`}
                style={{ position: 'absolute', left: 0, top: 0 }}
                aria-hidden="true"
            >
                <line
                    x1={12}
                    x2={22}
                    y1={y}
                    y2={y}
                    stroke={theme.ink}
                    strokeWidth={0.3}
                />
                <line
                    x1={62}
                    x2={72}
                    y1={y}
                    y2={y}
                    stroke="#555"
                    strokeWidth={0.3}
                    strokeDasharray="1.2 1"
                />
                <rect
                    x={112}
                    y={y - 1.6}
                    width={10}
                    height={3.2}
                    fill={TAB_FILL}
                    stroke={theme.ink}
                    strokeWidth={0.2}
                />
            </svg>
            {items.map((item) => (
                <span
                    key={item.label}
                    style={{
                        position: 'absolute',
                        left: mm(item.x + 12),
                        top: mm(y - 1.8),
                        fontSize: mm(3),
                        lineHeight: mm(3.6),
                        color: theme.ink,
                    }}
                >
                    {item.label}
                </span>
            ))}
            <span
                style={{
                    position: 'absolute',
                    right: mm(12),
                    top: mm(y - 1.8),
                    fontFamily: theme.monoFont,
                    fontSize: mm(2.8),
                    lineHeight: mm(3.6),
                    color: theme.ink,
                }}
            >
                {label}
            </span>
        </>
    );
}
