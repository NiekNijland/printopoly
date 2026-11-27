import { mix } from '@/lib/render/color';
import { SPARTAN } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { Pill } from './board-look';
import { ConfettiField, ScallopBadge } from './card-look-playful';
import { FitText } from './fit-text';
import {
    confettiColors,
    deckIcon,
    hasText,
    type ArtPlateProps,
    type StyledBackProps,
} from './game-card-styles-shared';
import { Icon } from './icons';
import { useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

const PlayfulBackEdition = ({
    deck,
    w,
    edition,
    top,
}: {
    deck: StyledBackProps['deck'];
    w: number;
    edition: string;
    top: number;
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];

    return (
        <div
            style={{
                position: 'absolute',
                left: mm(w / 2 - 17),
                top: mm(top),
                width: mm(34),
                height: mm(6.5),
                transform: 'rotate(2deg)',
            }}
        >
            <Pill
                x={0}
                y={0}
                w={34}
                h={6.5}
                fill={mix(accent, theme.paper, 0.78)}
                ink={theme.ink}
            />
            <FitText
                text={edition}
                x={3}
                y={0.8}
                w={28}
                h={4.9}
                maxFontMm={3}
                minFontMm={1.6}
                font="body"
                weight={600}
                align="center"
                color={theme.ink}
                slot="edition"
            />
        </div>
    );
};

const PlayfulBackIcon = ({
    deck,
    w,
    cy,
    icon,
}: {
    deck: StyledBackProps['deck'];
    w: number;
    cy: number;
    icon?: SpaceIconSource;
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];

    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: 'rotate(-8deg)',
                transformOrigin: `${mm(w / 2)} ${mm(cy - 8)}`,
            }}
        >
            <SpaceIconArt
                icon={icon}
                fallback={deckIcon(deck)}
                x={w / 2 - 6}
                y={cy - 14}
                size={12}
                color={accent}
                strokeWidth={1.6}
            />
        </div>
    );
};

export const PlayfulBack = ({
    deck,
    w,
    h,
    name,
    edition,
    icon,
}: StyledBackProps) => {
    const { theme } = useRender();
    const cy = h / 2 - 4;
    const r = 19.5;
    const seed = deck === 'chance' ? 31 : 47;

    return (
        <>
            <ConfettiField
                w={w}
                h={h}
                colors={confettiColors(theme, deck)}
                seed={seed}
                count={30}
                size={1}
                keep={{
                    x: w / 2 - r - 1,
                    y: cy - r - 1,
                    w: 2 * r + 2,
                    h: 2 * r + 12,
                }}
            />
            <ScallopBadge
                cx={w / 2}
                cy={cy}
                r={r}
                fill={theme.paper}
                ink={theme.ink}
                bumps={20}
            />
            <PlayfulBackIcon deck={deck} w={w} cy={cy} icon={icon} />
            <FitText
                text={name}
                x={w / 2 - 14.5}
                y={cy + 0.5}
                w={29}
                h={10}
                maxFontMm={6.5}
                minFontMm={2.4}
                wrap="words"
                family={SPARTAN}
                weight={800}
                lineHeight={1}
                align="center"
                color={theme.ink}
                slot="title"
            />
            {hasText(edition) && (
                <PlayfulBackEdition
                    deck={deck}
                    w={w}
                    edition={edition}
                    top={cy + r + 2.5}
                />
            )}
        </>
    );
};

export const PlayfulArtPlate = ({
    deck,
    w,
    h,
    name,
    edition,
}: ArtPlateProps) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const cy = h / 2;

    return (
        <>
            <ScallopBadge
                cx={w / 2}
                cy={cy}
                r={18}
                fill={theme.paper}
                ink={theme.ink}
                bumps={20}
            />
            <Icon
                name={deckIcon(deck)}
                x={w / 2 - 5}
                y={cy - 13.5}
                size={10}
                color={accent}
                strokeWidth={1.6}
            />
            <FitText
                text={name}
                x={w / 2 - 13.5}
                y={cy - 3}
                w={27}
                h={9}
                maxFontMm={6}
                minFontMm={2.4}
                wrap="words"
                family={SPARTAN}
                weight={800}
                lineHeight={1}
                align="center"
                color={theme.ink}
                slot="title"
            />
            {hasText(edition) && (
                <FitText
                    text={edition}
                    x={w / 2 - 12}
                    y={cy + 6.5}
                    w={24}
                    h={4}
                    maxFontMm={2.6}
                    minFontMm={1.5}
                    font="body"
                    weight={600}
                    align="center"
                    color={theme.ink}
                    slot="edition"
                />
            )}
        </>
    );
};
