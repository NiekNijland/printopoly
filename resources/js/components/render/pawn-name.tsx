import type { PawnStyle } from '@/lib/render/edition-part-styles';
import { type Theme } from '@/lib/render/themes';

import { ruleColor } from './board-look';
import { NAME_BOX, PANEL_HEIGHT, PAWN_WIDTH } from './pawn-layout';
import {
    Art,
    ConfettiShape,
    blockColor,
    diamond,
    type ConfettiPiece,
} from './piece-styles';
import { Abs, useRender } from './sheet';

/** What a style draws around the name: the flourishes of Vintage, the bar of Modern, the confetti of Speels. */
export const NameDecor = ({
    look,
    seed,
}: {
    look: PawnStyle | undefined;
    seed: number;
}) => {
    const { theme, style } = useRender();
    const w = PAWN_WIDTH;
    const h = PANEL_HEIGHT;
    const cx = NAME_BOX.x + NAME_BOX.w / 2;

    if (look === 'vintage') {
        const color = ruleColor(theme);
        const flourish = (y: number) =>
            `M${String(cx - 6.5)} ${String(y)}L${String(cx - 1.3)} ${String(y)}M${String(cx + 1.3)} ${String(y)}L${String(cx + 6.5)} ${String(y)}`;

        return (
            <Art x={0} y={0} w={w} h={h} slot="flourish">
                {[3.1, h - 3.1].map((y) => (
                    <g key={y}>
                        <path
                            d={flourish(y)}
                            stroke={color}
                            strokeWidth={0.14}
                        />
                        <path d={diamond(cx, y, 0.6)} fill={color} />
                        <circle cx={cx - 6.9} cy={y} r={0.22} fill={color} />
                        <circle cx={cx + 6.9} cy={y} r={0.22} fill={color} />
                    </g>
                ))}
            </Art>
        );
    }

    if (look === 'modern') {
        return (
            <Abs
                x={NAME_BOX.x + 0.4}
                y={h - 1.5 - 1.6}
                w={8}
                h={1.6}
                slot="name-bar"
                style={{ background: blockColor(theme) }}
            />
        );
    }

    if (look === 'playful') {
        const colors = confettiColors(theme, style?.groupColors);
        const spots: [number, number, ConfettiPiece['kind']][] = [
            [NAME_BOX.x + 1.4, 2.6, 'dot'],
            [NAME_BOX.x + 6.2, 2.2, 'squiggle'],
            [w - 2.6, 2.9, 'star'],
            [w - 2.4, h - 2.8, 'ring'],
            [NAME_BOX.x + 10.5, h - 2.1, 'dash'],
            [NAME_BOX.x + 1.8, h - 2.6, 'star'],
        ];

        return (
            <Art x={0} y={0} w={w} h={h} slot="confetti">
                {spots.map(([x, y, kind], index) => (
                    <ConfettiShape
                        key={index}
                        piece={{
                            x,
                            y,
                            kind,
                            size: 1.3,
                            color:
                                colors[(index + seed) % colors.length] ??
                                theme.ink,
                            turn: (seed * 37 + index * 53) % 180,
                        }}
                    />
                ))}
            </Art>
        );
    }

    return null;
};

/** The colours of confetti: the accents of the theme and a few street colours. */
const confettiColors = (
    theme: Theme,
    own: Partial<Record<string, string>> | undefined,
): string[] => {
    const street = (id: string, standard: string) =>
        own?.[id] ?? theme.groupColors?.[id] ?? standard;

    return [
        blockColor(theme),
        theme.deckAccent.chance,
        street('yellow', '#F2D200'),
        theme.deckAccent.chest,
        street('green', '#1FA25A'),
    ];
};
