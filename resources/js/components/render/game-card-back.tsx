import type { PatternId } from '@/lib/render/patterns';
import type { PhotoSource } from '@/lib/render/photo';
import { partStyleOf } from '@/lib/render/style';
import type { DeckId } from '@/types/game';

import { FitText } from './fit-text';
import { StyledArtPlate, StyledCardBack } from './game-card-styles';
import { Icon } from './icons';
import { PatternFill } from './pattern-fill';
import { PhotoSlot } from './photo-slot';
import { CardFrame, Abs, Frame, useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

type ArtBackProps = {
    deck: DeckId;
    name: string;
    edition?: string;
    photo?: PhotoSource;
    pattern?: PatternId;
    w: number;
    h: number;
    bleed: number;
};

/**
 * A back made of a photo or a pattern, over the whole card including the bleed (B56, B130), with a
 * small plate in the middle that names the deck so the two backs stay apart.
 */
const ArtBack = ({
    deck,
    name,
    edition,
    photo,
    pattern,
    w,
    h,
    bleed,
}: ArtBackProps) => {
    const { theme, style } = useRender();
    const cardStyle = partStyleOf(style, 'cards');
    const accent = theme.deckAccent[deck];

    return (
        <>
            <Abs
                x={-bleed}
                y={-bleed}
                w={w + 2 * bleed}
                h={h + 2 * bleed}
                slot="back-art"
            >
                {photo !== undefined ? (
                    <PhotoSlot
                        x={0}
                        y={0}
                        w={w + 2 * bleed}
                        h={h + 2 * bleed}
                        photo={photo}
                    />
                ) : pattern !== undefined ? (
                    <div style={{ opacity: 0.55 }}>
                        <PatternFill
                            id={pattern}
                            w={w + 2 * bleed}
                            h={h + 2 * bleed}
                            color={accent}
                            originX={-bleed}
                            originY={-bleed}
                        />
                    </div>
                ) : null}
            </Abs>
            {cardStyle !== undefined ? (
                <StyledArtPlate
                    style={cardStyle}
                    deck={deck}
                    w={w}
                    h={h}
                    name={name}
                    edition={edition}
                    bleed={bleed}
                />
            ) : (
                <ThemePlate
                    deck={deck}
                    name={name}
                    edition={edition}
                    w={w}
                    h={h}
                />
            )}
        </>
    );
};

/** The plate of an art back in the theme's own look: a framed box with the symbol, the name and the edition. */
const ThemePlate = ({
    deck,
    name,
    edition,
    w,
    h,
}: {
    deck: DeckId;
    name: string;
    edition?: string;
    w: number;
    h: number;
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const iconName = deck === 'chance' ? 'dice' : 'chest';
    const plateW = w - 16;
    const plateH = 30;
    const plateX = 8;
    const plateY = h / 2 - plateH / 2;

    return (
        <>
            <Frame
                ornate
                x={plateX}
                y={plateY}
                w={plateW}
                h={plateH}
                color={theme.ink}
                strokeMm={theme.frameMm}
                radiusMm={Math.max(0, theme.cardRadiusMm - 1)}
                fill={theme.paper}
            />
            <Icon
                name={iconName}
                x={w / 2 - 5}
                y={plateY + 3}
                size={10}
                color={accent}
                strokeWidth={1.4}
            />
            <FitText
                text={name}
                x={plateX + 3}
                y={plateY + 13.5}
                w={plateW - 6}
                h={9}
                maxFontMm={8}
                minFontMm={3}
                wrap="words"
                font="heading"
                align="center"
                valign="middle"
                slot="title"
            />
            {edition !== undefined && edition !== '' && (
                <FitText
                    text={edition}
                    x={plateX + 3}
                    y={plateY + 23}
                    w={plateW - 6}
                    h={4.5}
                    maxFontMm={3.2}
                    minFontMm={2}
                    font="body"
                    align="center"
                    slot="edition"
                />
            )}
        </>
    );
};

type ThemeBackProps = {
    deck: DeckId;
    w: number;
    h: number;
    name: string;
    edition?: string;
    photo?: PhotoSource;
    icon?: SpaceIconSource;
};

const ThemeCardBack = ({
    deck,
    w,
    h,
    name,
    edition,
    photo,
    icon,
}: ThemeBackProps) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const iconName = deck === 'chance' ? 'dice' : 'chest';
    const hasMedia = photo !== undefined;
    // Without a photo the back is a centred stack: symbol, deck name, edition name.
    // With a photo the name moves up and the photo takes the space below it.
    const stacked = !hasMedia;
    const nameTop = stacked ? h / 2 - 9 : 9;
    const nameHeight = stacked ? 16 : 14;

    return (
        <>
            <CardFrame w={w} h={h} />
            {stacked && (
                <SpaceIconArt
                    icon={icon}
                    fallback={iconName}
                    x={w / 2 - 8}
                    y={h / 2 - 28}
                    size={16}
                    color={accent}
                    strokeWidth={1.4}
                />
            )}
            <FitText
                text={name}
                x={6}
                y={nameTop}
                w={w - 12}
                h={nameHeight}
                maxFontMm={11}
                minFontMm={3}
                wrap="words"
                font="heading"
                align="center"
                valign="middle"
                slot="title"
            />
            {stacked && edition !== undefined && edition !== '' && (
                <FitText
                    text={edition}
                    x={6}
                    y={h / 2 + 9}
                    w={w - 12}
                    h={6}
                    maxFontMm={3.6}
                    minFontMm={2}
                    font="body"
                    align="center"
                    slot="edition"
                />
            )}
            {hasMedia && (
                <PhotoSlot
                    x={8}
                    y={26}
                    w={w - 16}
                    h={h - 26 - 12}
                    photo={photo}
                />
            )}
        </>
    );
};

export const CardBack = ({
    deck,
    w,
    h,
    name,
    edition,
    photo,
    pattern,
    icon,
    bleed,
}: {
    deck: DeckId;
    w: number;
    h: number;
    name: string;
    edition?: string;
    photo?: PhotoSource;
    pattern?: PatternId;
    icon?: SpaceIconSource;
    bleed: number;
}) => {
    const { style } = useRender();
    const cardStyle = partStyleOf(style, 'cards');

    if (photo !== undefined || pattern !== undefined) {
        return (
            <ArtBack
                deck={deck}
                name={name}
                edition={edition}
                photo={photo}
                pattern={pattern}
                w={w}
                h={h}
                bleed={bleed}
            />
        );
    }

    if (cardStyle !== undefined) {
        return (
            <StyledCardBack
                style={cardStyle}
                deck={deck}
                w={w}
                h={h}
                name={name}
                edition={edition}
                icon={icon}
            />
        );
    }

    return (
        <ThemeCardBack
            deck={deck}
            w={w}
            h={h}
            name={name}
            edition={edition}
            photo={photo}
            icon={icon}
        />
    );
};
