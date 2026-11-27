import { readableOn } from '@/lib/render/color';
import { SPARTAN } from '@/lib/render/themes';
import type { DeckId } from '@/types/game';

import { FitText } from './fit-text';
import {
    deckIcon,
    hasText,
    type ArtPlateProps,
    type StyledBackProps,
} from './game-card-styles-shared';
import { Icon } from './icons';
import { Abs, useRender, Svg } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

const ModernBackDisc = ({
    deck,
    w,
    h,
    icon,
}: {
    deck: DeckId;
    w: number;
    h: number;
    icon?: SpaceIconSource;
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const on = readableOn(accent);
    const cy = 31;

    return (
        <>
            <Svg x={0} y={0} w={w} h={h} slot="disc">
                <circle
                    cx={w / 2}
                    cy={cy}
                    r={23}
                    fill="none"
                    stroke={on}
                    strokeWidth={0.5}
                    opacity={0.35}
                />
                <circle cx={w / 2} cy={cy} r={17} fill={theme.paper} />
            </Svg>
            <SpaceIconArt
                icon={icon}
                fallback={deckIcon(deck)}
                x={w / 2 - 10}
                y={cy - 10}
                size={20}
                color={accent}
                strokeWidth={1.6}
            />
        </>
    );
};

export const ModernBack = ({
    deck,
    w,
    h,
    name,
    edition,
    icon,
}: StyledBackProps) => {
    const { theme } = useRender();
    const on = readableOn(theme.deckAccent[deck]);

    return (
        <>
            <ModernBackDisc deck={deck} w={w} h={h} icon={icon} />
            <FitText
                text={name}
                x={5}
                y={56}
                w={w - 10}
                h={15}
                maxFontMm={11}
                minFontMm={3}
                wrap="words"
                family={SPARTAN}
                weight={800}
                caps
                letterSpacingEm={-0.01}
                lineHeight={0.95}
                align="center"
                valign="middle"
                color={on}
                slot="title"
            />
            <Abs
                x={w / 2 - 5}
                y={72.5}
                w={10}
                h={1.2}
                style={{ background: on }}
            />
            {edition !== undefined && hasText(edition) && (
                <FitText
                    text={edition}
                    x={8}
                    y={75}
                    w={w - 16}
                    h={4.5}
                    maxFontMm={2.8}
                    minFontMm={1.6}
                    font="body"
                    weight={600}
                    caps
                    letterSpacingEm={0.14}
                    align="center"
                    color={on}
                    slot="edition"
                />
            )}
        </>
    );
};

export const ModernArtPlate = ({
    deck,
    w,
    h,
    name,
    edition,
    bleed,
}: ArtPlateProps) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const cy = h / 2;
    const on = readableOn(accent);

    return (
        <>
            <Abs
                x={-bleed}
                y={cy - 13}
                w={w + 2 * bleed}
                h={26}
                style={{ background: accent }}
                slot="plate"
            />
            <Svg x={5} y={cy - 8} w={16} h={16}>
                <circle cx={8} cy={8} r={8} fill={theme.paper} />
            </Svg>
            <Icon
                name={deckIcon(deck)}
                x={8}
                y={cy - 5}
                size={10}
                color={accent}
                strokeWidth={1.6}
            />
            <FitText
                text={name}
                x={24}
                y={cy - 9}
                w={w - 29}
                h={hasText(edition) ? 12 : 18}
                maxFontMm={7.5}
                minFontMm={2.6}
                wrap="words"
                family={SPARTAN}
                weight={800}
                caps
                lineHeight={0.95}
                align="left"
                valign={hasText(edition) ? 'bottom' : 'middle'}
                color={on}
                slot="title"
            />
            {edition !== undefined && hasText(edition) && (
                <FitText
                    text={edition}
                    x={24}
                    y={cy + 4}
                    w={w - 29}
                    h={4.4}
                    maxFontMm={2.8}
                    minFontMm={1.6}
                    font="body"
                    weight={600}
                    caps
                    letterSpacingEm={0.12}
                    align="left"
                    color={on}
                    slot="edition"
                />
            )}
        </>
    );
};
