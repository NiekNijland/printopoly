import type { Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { Abs } from './sheet';

/** The colour bar of a print shop proof: cyan, magenta, yellow and black, as on the edge of the site. */
export function InkBar({
    x,
    y,
    w,
    h = 1.6,
    theme,
}: {
    x: number;
    y: number;
    w: number;
    h?: number;
    theme: Theme;
}) {
    const inks = [
        theme.deckAccent.chance,
        theme.deckAccent.chest,
        '#FFD500',
        theme.ink,
    ];

    return (
        <Abs x={x} y={y} w={w} h={h} style={{ display: 'flex' }}>
            {inks.map((ink) => (
                <span
                    key={ink}
                    style={{ flex: 1, background: ink, height: mm(h) }}
                />
            ))}
        </Abs>
    );
}
