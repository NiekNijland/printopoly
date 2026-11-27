import { readableOn } from '@/lib/render/color';
import { standardEdition } from '@/lib/render/standard-edition';
import type { Theme } from '@/lib/render/themes';
import type { Space } from '@/types/game';
import type { Rect } from '@/types/print';

import { FitText } from './fit-text';
import { Abs, useRender, BoxSvg } from './sheet';

export const groupColor = (group: string, theme: Theme): string => {
    return (
        theme.groupColors?.[group] ??
        standardEdition.groups.find((candidate) => candidate.id === group)
            ?.color ??
        '#CFC6B2'
    );
};

/**
 * The colour band of a street: an ink line under it, and the town in small spaced capitals inside the band (ronde 4:
 * the town under the band looked loose). With a town a fine second line follows the ink line, like the double rules
 * on old play money; without one the pair read as a drawing error (Niek, 24 nov), so the ink line stands alone.
 */
const ColorBand = ({
    bleed,
    w,
    bar,
    color,
    town,
}: {
    bleed: number;
    w: number;
    bar: number;
    color: string;
    town?: string;
}) => {
    const { theme } = useRender();
    const hasTown = town !== undefined && town !== '';

    return (
        <>
            <Abs
                x={-bleed}
                y={-bleed}
                w={w + 2 * bleed}
                h={bar + bleed}
                style={{
                    background: color,
                    borderBottom: `${theme.frameMm}mm solid ${theme.ink}`,
                    boxSizing: 'border-box',
                }}
                slot="color-bar"
            />
            {hasTown && (
                <Abs
                    x={0}
                    y={bar + 0.6}
                    w={w}
                    h={0.15}
                    style={{ background: theme.line }}
                    slot="band-rule"
                />
            )}
            {hasTown && (
                <FitText
                    text={town}
                    x={1.8}
                    y={0}
                    w={w - 3.6}
                    h={bar - theme.frameMm}
                    maxFontMm={Math.min(2.5, bar * 0.2)}
                    minFontMm={1.5}
                    font="body"
                    weight={600}
                    caps
                    letterSpacingEm={0.12}
                    color={readableOn(color)}
                    align="center"
                    slot="town"
                />
            )}
        </>
    );
};

/** The price at the foot of a space, under a short fine rule. */
export const PriceLine = ({
    w,
    top,
    text,
    rule,
}: {
    w: number;
    top: number;
    text: string;
    rule: boolean;
}) => {
    const { theme } = useRender();

    return (
        <>
            {rule && (
                <Abs
                    x={w * 0.34}
                    y={top}
                    w={w * 0.32}
                    h={0.15}
                    style={{ background: theme.line }}
                    slot="price-rule"
                />
            )}
            <FitText
                text={text}
                x={2}
                y={top + 0.6}
                w={w - 4}
                h={6.4}
                maxFontMm={3.4}
                minFontMm={2}
                font="body"
                weight={600}
                align="center"
                slot="price"
            />
        </>
    );
};

export const StreetBand = ({
    space,
    bleed,
    w,
    bar,
    town,
}: {
    space: Space;
    bleed: number;
    w: number;
    bar: number;
    town?: string | undefined;
}) => {
    const { theme, style } = useRender();

    if (space.type !== 'street') {
        return null;
    }

    return (
        <ColorBand
            bleed={bleed}
            w={w}
            bar={bar}
            color={
                style?.groupColors?.[space.group] ??
                groupColor(space.group, theme)
            }
            town={town}
        />
    );
};

/** An oval with a fine second line inside, like the value oval of a banknote. */
export const EngravedOval = ({
    x,
    y,
    w,
    h,
    color,
    fill,
}: Rect & { color: string; fill: string }) => {
    return (
        <BoxSvg x={x} y={y} w={w} h={h} overflow="visible" data-slot="oval">
            <ellipse
                cx={w / 2}
                cy={h / 2}
                rx={w / 2 - 0.2}
                ry={h / 2 - 0.2}
                fill={fill}
                stroke={color}
                strokeWidth={0.4}
            />
            <ellipse
                cx={w / 2}
                cy={h / 2}
                rx={Math.max(0, w / 2 - 1.1)}
                ry={Math.max(0, h / 2 - 1.1)}
                fill="none"
                stroke={color}
                strokeWidth={0.15}
            />
        </BoxSvg>
    );
};
