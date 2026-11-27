import { mix } from '@/lib/render/color';
import { PLAYFAIR } from '@/lib/render/themes';
import type { DeckId } from '@/types/game';

import { Cartouche } from './board-look';
import { creamed, engraving } from './card-look';
import {
    Flourish,
    borderItems,
    discItem,
    fieldItem,
    ovalItems,
    rosetteItem,
} from './card-look-engraving';
import { Ornament } from './card-look-ornament';
import { FitText } from './fit-text';
import {
    V_BAND,
    V_INSET,
    deckIcon,
    hasText,
    vintageInks,
    type ArtPlateProps,
    type StyledBackProps,
} from './game-card-styles-shared';
import { Icon } from './icons';
import { useRender } from './sheet';
import { SpaceIconArt } from './space-icon';

const VintageBackEngraving = ({
    deck,
    w,
    h,
}: {
    deck: DeckId;
    w: number;
    h: number;
}) => {
    const { theme } = useRender();
    const { engr, paper, plate } = vintageInks(theme, deck);
    const inner = V_INSET + V_BAND;
    const cy = h / 2;

    return (
        <>
            {/* The ground, border, oval and rosette as one picture per deck in print (B269). */}
            <Ornament
                x={0}
                y={0}
                w={w}
                h={h}
                background={paper}
                slot="engraved-border"
                items={[
                    fieldItem({
                        x: inner,
                        y: inner,
                        w: w - 2 * inner,
                        h: h - 2 * inner,
                        color: engr,
                        alpha: 0.2,
                    }),
                    ...borderItems({
                        w,
                        h,
                        inset: V_INSET,
                        band: V_BAND,
                        color: engr,
                        paper,
                    }),
                    ...ovalItems({
                        x: w / 2 - 22.5,
                        y: cy - 31,
                        w: 45,
                        h: 62,
                        color: engr,
                        fill: plate,
                    }),
                    rosetteItem({
                        cx: w / 2,
                        cy: cy - 13,
                        r: 10.5,
                        color: engr,
                        alpha: 0.5,
                        count: 24,
                    }),
                    discItem({
                        cx: w / 2,
                        cy: cy - 13,
                        r: 6,
                        color: engr,
                        fill: plate,
                    }),
                ]}
            />
        </>
    );
};

export const VintageBack = ({
    deck,
    w,
    h,
    name,
    edition,
    icon,
}: StyledBackProps) => {
    const { theme } = useRender();
    const { accent, engr, plate } = vintageInks(theme, deck);
    const cy = h / 2;

    return (
        <>
            <VintageBackEngraving deck={deck} w={w} h={h} />
            <SpaceIconArt
                icon={icon}
                fallback={deckIcon(deck)}
                x={w / 2 - 4.5}
                y={cy - 17.5}
                size={9}
                color={accent}
                strokeWidth={1.5}
            />
            <Cartouche
                x={5.5}
                y={cy + 0.5}
                w={w - 11}
                h={12}
                color={engr}
                fill={plate}
            />
            <FitText
                text={name}
                x={8.5}
                y={cy + 2}
                w={w - 17}
                h={9}
                maxFontMm={6.4}
                minFontMm={2.6}
                wrap="words"
                family={PLAYFAIR}
                weight={700}
                caps
                letterSpacingEm={0.1}
                lineHeight={1.05}
                align="center"
                color={theme.ink}
                slot="title"
            />
            <Flourish x={w / 2 - 10} y={cy + 15.6} w={20} color={engr} />
            {hasText(edition) && (
                <FitText
                    text={edition}
                    // Inside the oval, clear of its rule: a long name wraps onto a second line (Niek, 22 nov).
                    x={w / 2 - 12}
                    y={cy + 17.2}
                    w={24}
                    h={6.6}
                    maxFontMm={2.5}
                    minFontMm={1.5}
                    wrap="words"
                    family={PLAYFAIR}
                    weight={700}
                    caps
                    letterSpacingEm={0.12}
                    lineHeight={1.15}
                    align="center"
                    valign="top"
                    color={engr}
                    slot="edition"
                />
            )}
        </>
    );
};

export const VintageArtPlate = ({
    deck,
    w,
    h,
    name,
    edition,
}: ArtPlateProps) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const cy = h / 2;
    const engr = engraving(theme, accent);
    const plate = mix(creamed(theme.deck[deck], 0.5), '#FFFFFF', 0.4);

    return (
        <>
            <Cartouche
                x={7}
                y={cy - 16}
                w={w - 14}
                h={32}
                color={engr}
                fill={plate}
            />
            <Icon
                name={deckIcon(deck)}
                x={w / 2 - 4}
                y={cy - 13}
                size={8}
                color={accent}
                strokeWidth={1.5}
            />
            <FitText
                text={name}
                x={10}
                y={cy - 3.5}
                w={w - 20}
                h={8}
                maxFontMm={6}
                minFontMm={2.6}
                wrap="words"
                family={PLAYFAIR}
                weight={700}
                caps
                letterSpacingEm={0.1}
                align="center"
                color={theme.ink}
                slot="title"
            />
            <Flourish x={w / 2 - 10} y={cy + 6} w={20} color={engr} />
            {hasText(edition) && (
                <FitText
                    text={edition}
                    x={11}
                    y={cy + 8.2}
                    w={w - 22}
                    h={4.4}
                    maxFontMm={2.5}
                    minFontMm={1.6}
                    family={PLAYFAIR}
                    weight={700}
                    caps
                    letterSpacingEm={0.16}
                    align="center"
                    color={engr}
                    slot="edition"
                />
            )}
        </>
    );
};
