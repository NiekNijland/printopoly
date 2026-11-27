import { deedContent } from '@/lib/render/deed-rows';
import type { DeedStyle } from '@/lib/render/edition-part-styles';
import { STRINGS } from '@/lib/render/strings';
import { partStyleOf } from '@/lib/render/style';
import type { OwnableSpace } from '@/types/game';

import { FitText } from './fit-text';
import { Frame, useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';
import {
    BLOCK,
    BLOCK_HEIGHT,
    DEED_SEED,
    DeedBlock,
    DeedFrame,
    FRAME,
    blockColors,
    iconOf,
    townLabel,
} from './title-deed-parts';
import { StyledMortgageBox, deedLookOf } from './title-deed-styles';

type MortgageBoxProps = {
    w: number;
    boxTop: number;
    boxHeight: number;
    boxIcon: ReturnType<typeof iconOf>;
    icon?: SpaceIconSource;
    deedStyle: DeedStyle | undefined;
    band: string;
    street: boolean;
    mortgage: string;
};

const MortgageBox = ({
    w,
    boxTop,
    boxHeight,
    boxIcon,
    icon,
    deedStyle,
    band,
    street,
    mortgage,
}: MortgageBoxProps) => {
    const { theme, locale } = useRender();
    const t = STRINGS[locale];
    const look = deedStyle === undefined ? undefined : deedLookOf(deedStyle);
    const valueTop = boxTop + (boxIcon === null ? 11 : 15.5);

    return (
        <>
            {deedStyle === undefined ? (
                <Frame
                    x={BLOCK + 3}
                    y={boxTop}
                    w={w - 2 * BLOCK - 6}
                    h={boxHeight}
                    color={theme.ink}
                    strokeMm={0.25}
                />
            ) : (
                <StyledMortgageBox
                    style={deedStyle}
                    x={BLOCK + 3}
                    y={boxTop}
                    w={w - 2 * BLOCK - 6}
                    h={boxHeight}
                    band={band}
                    street={street}
                    seed={DEED_SEED}
                />
            )}
            {boxIcon !== null && (
                <SpaceIconArt
                    icon={icon}
                    fallback={boxIcon}
                    x={(w - 7) / 2}
                    y={boxTop + 2.5}
                    size={7}
                    color={theme.ink}
                    strokeWidth={1.5}
                />
            )}
            <FitText
                text={t.mortgage.toUpperCase()}
                // Inside the oval of Vintage the label keeps clear of the curved edge.
                x={BLOCK + (deedStyle === 'vintage' ? 10 : 5)}
                y={valueTop - 6}
                w={w - 2 * BLOCK - (deedStyle === 'vintage' ? 20 : 10)}
                h={5}
                maxFontMm={3}
                minFontMm={2}
                font="body"
                weight={600}
                {...look?.label}
                align="center"
                slot="mortgage-label"
            />
            <FitText
                text={mortgage}
                x={BLOCK + 5}
                y={valueTop}
                w={w - 2 * BLOCK - 10}
                h={boxTop + boxHeight - 3 - valueTop}
                maxFontMm={12}
                minFontMm={5}
                font="heading"
                {...look?.value}
                align="center"
                slot="mortgage"
            />
        </>
    );
};

const DeedBackText = ({
    w,
    h,
    tale,
    storyTop,
    storyHeight,
    textTop,
    unmortgage,
}: {
    w: number;
    h: number;
    tale: string;
    storyTop: number;
    storyHeight: number;
    textTop: number;
    unmortgage: string;
}) => {
    const { locale } = useRender();
    const t = STRINGS[locale];
    const hasStory = tale !== '';

    return (
        <>
            {hasStory && (
                <FitText
                    text={tale}
                    x={BLOCK + 2}
                    y={storyTop}
                    w={w - 2 * BLOCK - 4}
                    h={storyHeight}
                    maxFontMm={3.4}
                    minFontMm={2}
                    wrap="words"
                    font="body"
                    align="center"
                    valign="middle"
                    lineHeight={1.3}
                    italic
                    slot="story"
                />
            )}
            <FitText
                text={t.mortgageBack(unmortgage)}
                x={BLOCK + 2}
                y={textTop}
                w={w - 2 * BLOCK - 4}
                h={h - FRAME - 3 - textTop}
                maxFontMm={2.9}
                minFontMm={1.8}
                wrap="words"
                font="body"
                align="center"
                valign="top"
                lineHeight={1.3}
                slot="mortgage-text"
            />
        </>
    );
};

type BackProps = {
    space: OwnableSpace;
    w: number;
    h: number;
    name?: string;
    town?: string;
    icon?: SpaceIconSource;
    story?: string;
    bleed: number;
};

export const DeedBack = ({
    space,
    w,
    h,
    name,
    town,
    icon,
    story,
    bleed,
}: BackProps) => {
    const { theme, locale, currency, words, style } = useRender();
    const deedStyle = partStyleOf(style, 'deeds');
    const street = space.type === 'street';
    const t = STRINGS[locale];
    const content = deedContent(space, locale, currency, words);
    const { band, onBand } = blockColors(space, theme, style);
    const townText = townLabel(space, town);
    const iconName = iconOf(space);
    // The mortgage sits in a box of its own under the block; our own words about it below (B76). A story about the
    // place (B169) goes between the two, in italics, and the box gives it room.
    const tale = story?.trim() ?? '';
    const hasStory = tale !== '';
    const boxTop = BLOCK + BLOCK_HEIGHT + (hasStory ? 3 : 6);
    const boxHeight = hasStory ? 22 : 36;
    const storyTop = boxTop + boxHeight + 2;
    const storyHeight = 20;
    // With a story the small icon leaves the box, so the amount keeps its room; the icon is on the front.
    const boxIcon = hasStory ? null : iconName;
    const textTop = hasStory
        ? storyTop + storyHeight + 1.5
        : boxTop + boxHeight + 3;

    return (
        <>
            <DeedFrame
                deedStyle={deedStyle}
                w={w}
                h={h}
                seed={DEED_SEED + 40}
            />
            <DeedBlock
                deedStyle={deedStyle}
                w={w}
                label={t.titleDeed}
                title={name ?? space.name[locale]}
                townText={townText}
                band={band}
                onBand={onBand}
                street={street}
                bleed={bleed}
                seed={DEED_SEED + 40}
            />
            <MortgageBox
                w={w}
                boxTop={boxTop}
                boxHeight={boxHeight}
                boxIcon={boxIcon}
                icon={icon}
                deedStyle={deedStyle}
                band={band}
                street={street}
                mortgage={content.mortgage}
            />
            <DeedBackText
                w={w}
                h={h}
                tale={tale}
                storyTop={storyTop}
                storyHeight={storyHeight}
                textTop={textTop}
                unmortgage={content.unmortgage}
            />
        </>
    );
};
