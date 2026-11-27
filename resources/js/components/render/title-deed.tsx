import type { CSSProperties } from 'react';

import { readableOn } from '@/lib/render/color';
import { deedContent } from '@/lib/render/deed-rows';
import { DEED_PHOTO } from '@/lib/render/edition-deed-photos';
import type { DeedStyle } from '@/lib/render/edition-part-styles';
import { bestTextOn } from '@/lib/render/gamut';
import type { PhotoSource } from '@/lib/render/photo';
import { standardEdition } from '@/lib/render/standard-edition';
import { STRINGS } from '@/lib/render/strings';
import { partStyleOf } from '@/lib/render/style';
import { THEMES, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import type { GroupId, OwnableSpace } from '@/types/game';

import { FitText } from './fit-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import { CARD_SIZE_MM } from './game-card';
import { PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';
import {
    StyledDeedFrame,
    StyledDeedHeader,
    StyledDeedRule,
    StyledMortgageBox,
    deedLookOf,
    styledDeedPaper,
    styledRowStyle,
} from './title-deed-styles';

export type TitleDeedProps = {
    space: OwnableSpace;
    side: 'front' | 'back';
    /** Replaces the name from the game data. */
    name?: string;
    /** Town of the colour group (streets only); shown small above the name. */
    town?: string;
    photo?: PhotoSource;
    /** The icon or image chosen for the station or utility on the board (B136). */
    icon?: SpaceIconSource;
    /** Free layers on the back, in mm from the top left of the card. */
    layers?: readonly RenderLayer[];
    /** A short story about the place, on the back under the mortgage (B169). */
    story?: string;
} & ElementProps;

/** Inset of the thin frame from the trim edge, and of the coloured block from the trim edge (B133). */
const FRAME = 3;
const BLOCK = 4.5;
const BLOCK_HEIGHT = 16.5;
/** Where the rule under the rent table of a street sits, and the height of a cost row below it. */
const RULE_Y = 66.5;
/**
 * With a photo the rule sits lower, in the room under the costs, so the taller photo (R5-05) leaves the rent rows
 * as large as before.
 */
const RULE_Y_PHOTO = 70.5;
const COST_ROW = 5;
/**
 * The hand-drawn edges of Speels are the same on every deed, so a print sheet holds each of them once as a picture
 * (B269).
 */
const DEED_SEED = 3;

const bandColor = (
    space: OwnableSpace,
    theme: Theme,
    groupColors?: Partial<Record<GroupId, string>>,
): string => {
    if (space.type === 'street') {
        return (
            groupColors?.[space.group] ??
            theme.groupColors?.[space.group] ??
            standardEdition.groups.find((group) => group.id === space.group)
                ?.color ??
            theme.ink
        );
    }

    return theme.ink;
};

/** Whether the edition gave this street's group a colour of its own. */
const isOwnGroupColor = (
    space: OwnableSpace,
    style: { groupColors?: Partial<Record<GroupId, string>> },
): boolean => {
    return (
        space.type === 'street' &&
        style.groupColors?.[space.group] !== undefined
    );
};

/** The town to print on a deed: only streets have one, and an empty text is none. */
const townLabel = (space: OwnableSpace, town: string | undefined) => {
    const text = space.type === 'street' ? town?.trim() : undefined;

    return text === undefined || text === '' ? undefined : text;
};

/**
 * A title deed at 63 x 88 mm, built like the original (B133): a thin frame, a block in the group colour with
 * "EIGENDOMSBEWIJS" and the name, the rent rows, a rule and the building costs. The back holds the mortgage.
 */
export const TitleDeed = ({
    space,
    side,
    name,
    town,
    photo,
    icon,
    layers,
    story,
    ...element
}: TitleDeedProps) => {
    const { w, h } = { w: CARD_SIZE_MM.width, h: CARD_SIZE_MM.height };
    const theme = THEMES[element.theme];
    // A style of its own for the deeds (B269) brings its own paper, into the bleed.
    const deedStyle = partStyleOf(element.style, 'deeds');
    const background =
        deedStyle === undefined
            ? theme.deedPaper
            : styledDeedPaper(
                  theme,
                  deedStyle,
                  blockColors(space, theme, element.style).band,
                  space.type === 'street',
              );

    return (
        <Sheet
            {...element}
            element={`deed-${space.type}-${side}`}
            widthMm={w}
            heightMm={h}
            background={background}
            rounded
        >
            {side === 'front' ? (
                <DeedFront
                    space={space}
                    w={w}
                    h={h}
                    name={name}
                    town={town}
                    photo={photo}
                    icon={icon}
                    bleed={element.bleedMm ?? 0}
                />
            ) : (
                <DeedBack
                    space={space}
                    w={w}
                    h={h}
                    name={name}
                    town={town}
                    icon={icon}
                    story={story}
                    bleed={element.bleedMm ?? 0}
                />
            )}
            {side === 'back' && layers !== undefined && (
                <FreeLayers layers={layers} />
            )}
        </Sheet>
    );
};

type FrontProps = {
    space: OwnableSpace;
    w: number;
    h: number;
    name?: string;
    town?: string;
    photo?: PhotoSource;
    icon?: SpaceIconSource;
    bleed: number;
};

const iconOf = (space: OwnableSpace): 'train' | 'bulb' | 'tap' | null => {
    if (space.type === 'station') {
        return 'train';
    }

    if (space.type === 'utility') {
        return space.position === 12 ? 'bulb' : 'tap';
    }

    return null;
};

/** One line of the table: the label on the left, the amount on the right. */
const Row = ({
    label,
    value,
    height,
    font,
    look,
}: {
    label: string;
    value: string;
    height: number;
    font: number;
    /** The look of the row in a deed style (B269): stripes, a dotted leader, heavier amounts. */
    look?: RowLook;
}) => {
    const leader = look?.leader ?? null;

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: mm(leader === null ? 2 : 1),
                height: mm(height),
                fontSize: mm(font),
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                ...look?.row,
            }}
            data-row=""
        >
            <span>{label}</span>
            {leader !== null && <span style={leader} aria-hidden="true" />}
            <span
                style={{ fontVariantNumeric: 'tabular-nums', ...look?.amount }}
            >
                {value}
            </span>
        </div>
    );
};

type RowLook = {
    row: CSSProperties;
    leader: CSSProperties | null;
    amount: CSSProperties;
};

/** The look of row `index` in a deed style, or none in the theme's own look. */
const rowLook = (
    deedStyle: DeedStyle | undefined,
    index: number,
    band: string,
    street: boolean,
    theme: Theme,
): RowLook | undefined => {
    if (deedStyle === undefined) {
        return undefined;
    }

    return {
        ...styledRowStyle(deedStyle, index, band, street, theme),
        amount: deedLookOf(deedStyle).amount,
    };
};

/** The colour of the block and the text on it: the group colour for streets, the paper for the others. */
const blockColors = (
    space: OwnableSpace,
    theme: Theme,
    style: { groupColors?: Partial<Record<GroupId, string>> } | undefined,
): { band: string; onBand: string } => {
    const band =
        space.type === 'street'
            ? bandColor(space, theme, style?.groupColors)
            : theme.deedPaper;
    const onBand =
        style?.groupColors !== undefined && isOwnGroupColor(space, style)
            ? bestTextOn(band)
            : readableOn(band);

    return { band, onBand };
};

const DeedFront = ({
    space,
    w,
    h,
    name,
    town,
    photo,
    icon,
    bleed,
}: FrontProps) => {
    const { theme, locale, currency, words, style } = useRender();
    const deedStyle = partStyleOf(style, 'deeds');
    const street = space.type === 'street';
    const t = STRINGS[locale];
    const content = deedContent(space, locale, currency, words);
    const title = name ?? space.name[locale];
    const townText = townLabel(space, town);
    const { band, onBand } = blockColors(space, theme, style);
    const hasPhoto = photo !== undefined;
    // "Full": the photo fills the top of the card behind the block (B124); the table keeps its own paper.
    const full = hasPhoto && isFullPhoto(photo);
    const blockBottom = BLOCK + BLOCK_HEIGHT;
    const photoBottom = DEED_PHOTO.bottom;
    const ruleY = hasPhoto ? RULE_Y_PHOTO : RULE_Y;
    const contentTop = hasPhoto ? photoBottom + 1.5 : blockBottom + 2.5;
    const iconName = iconOf(space);
    const iconSize =
        iconName === null || hasPhoto ? 0 : space.type === 'utility' ? 15 : 12;
    const rowsTop = contentTop + (iconSize > 0 ? iconSize + 3.5 : 0);
    const rowsBottom = space.type === 'street' ? ruleY - 1 : h - FRAME - 4;
    const rowCount = content.rows.length;
    const rowHeight =
        rowCount === 0 ? 0 : Math.min(6.5, (rowsBottom - rowsTop) / rowCount);
    const rowFont = Math.min(3.3, rowHeight * 0.62);

    // The paper tile of Speels and the border of Vintage (one opaque picture in print, B269) lie under a full photo;
    // the theme's frame is drawn over it.
    const frameUnder = deedStyle === 'playful' || deedStyle === 'vintage';

    return (
        <>
            {frameUnder && (
                <DeedFrame deedStyle={deedStyle} w={w} h={h} seed={DEED_SEED} />
            )}
            {full && (
                // Full width (B253): edge to edge into the bleed, under the block instead of behind it, so the
                // block never covers a face (R5-05, Ingrid in round 6).
                <PhotoSlot
                    x={-bleed}
                    y={blockBottom}
                    w={w + 2 * bleed}
                    h={photoBottom - blockBottom}
                    photo={photo}
                />
            )}
            {!frameUnder && (
                <DeedFrame deedStyle={deedStyle} w={w} h={h} seed={DEED_SEED} />
            )}
            {deedStyle === undefined ? (
                <DeedHeader
                    w={w}
                    label={t.titleDeed}
                    title={title}
                    townText={townText}
                    band={band}
                    bandBackground={band}
                    onBand={onBand}
                    outline={theme.deedFrame}
                />
            ) : (
                <StyledDeedHeader
                    style={deedStyle}
                    w={w}
                    block={BLOCK}
                    blockHeight={BLOCK_HEIGHT}
                    label={t.titleDeed}
                    title={title}
                    townText={townText}
                    band={band}
                    onBand={onBand}
                    street={street}
                    bleed={bleed}
                    seed={DEED_SEED}
                />
            )}
            {hasPhoto && !full && (
                <PhotoSlot
                    x={BLOCK}
                    y={DEED_PHOTO.top}
                    w={DEED_PHOTO.w}
                    h={photoBottom - DEED_PHOTO.top}
                    photo={photo}
                />
            )}
            {iconName !== null && iconSize > 0 && (
                <SpaceIconArt
                    icon={icon}
                    fallback={iconName}
                    x={(w - iconSize) / 2}
                    y={contentTop + 0.5}
                    size={iconSize}
                    color={theme.ink}
                    strokeWidth={1.5}
                />
            )}
            {rowCount > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        left: mm(BLOCK + 0.5),
                        top: mm(rowsTop),
                        width: mm(w - 2 * BLOCK - 1),
                    }}
                    data-slot="rent-table"
                >
                    {content.rows.map((row, index) => (
                        <Row
                            key={row.label}
                            label={row.label}
                            value={row.value}
                            height={rowHeight}
                            font={rowFont}
                            look={rowLook(
                                deedStyle,
                                index,
                                band,
                                street,
                                theme,
                            )}
                        />
                    ))}
                </div>
            )}
            {content.costs.length > 0 && (
                <>
                    {deedStyle === undefined ? (
                        <Abs
                            x={BLOCK + 0.5}
                            y={ruleY}
                            w={w - 2 * BLOCK - 1}
                            h={0}
                            style={{ borderTop: `0.2mm solid ${theme.ink}` }}
                            slot="rule"
                        />
                    ) : (
                        <StyledDeedRule
                            style={deedStyle}
                            x={BLOCK + 0.5}
                            y={ruleY}
                            w={w - 2 * BLOCK - 1}
                            band={band}
                            street={street}
                        />
                    )}
                    <div
                        style={{
                            position: 'absolute',
                            left: mm(BLOCK + 0.5),
                            top: mm(ruleY + 1),
                            width: mm(w - 2 * BLOCK - 1),
                        }}
                        data-slot="costs"
                    >
                        {content.costs.map((row) => (
                            <Row
                                key={row.label}
                                label={row.label}
                                value={row.value}
                                height={COST_ROW}
                                font={3.1}
                                look={rowLook(
                                    deedStyle,
                                    1,
                                    band,
                                    street,
                                    theme,
                                )}
                            />
                        ))}
                        <div
                            style={{
                                textAlign: 'right',
                                fontSize: mm(2.3),
                                lineHeight: 1,
                                whiteSpace: 'nowrap',
                            }}
                            data-slot="costs-note"
                        >
                            {content.costsNote}
                        </div>
                    </div>
                </>
            )}
            {space.type === 'utility' && (
                <FitText
                    text={content.footer}
                    x={BLOCK + 1.5}
                    y={rowsTop}
                    w={w - 2 * BLOCK - 3}
                    h={h - FRAME - 3 - rowsTop}
                    maxFontMm={3.3}
                    minFontMm={1.8}
                    wrap="words"
                    font="body"
                    align="center"
                    valign={hasPhoto ? 'middle' : 'top'}
                    lineHeight={1.35}
                    slot="footer"
                />
            )}
        </>
    );
};

/** The frame of a deed: the theme's thin frame, or the frame of the deed style (B269). */
const DeedFrame = ({
    deedStyle,
    w,
    h,
    seed,
}: {
    deedStyle: DeedStyle | undefined;
    w: number;
    h: number;
    seed: number;
}) => {
    const { theme } = useRender();

    return deedStyle === undefined ? (
        <Frame
            ornate
            x={FRAME}
            y={FRAME}
            w={w - 2 * FRAME}
            h={h - 2 * FRAME}
            color={theme.deedFrame}
            strokeMm={theme.deedFrameMm}
        />
    ) : (
        <StyledDeedFrame style={deedStyle} w={w} h={h} seed={seed} />
    );
};

/** The block at the top of both sides: "EIGENDOMSBEWIJS" small, the town if any, and the name in capitals. */
const DeedHeader = ({
    w,
    label,
    title,
    townText,
    band,
    bandBackground = band,
    onBand,
    outline,
}: {
    w: number;
    label: string;
    title: string;
    townText: string | undefined;
    band: string;
    /** The colour the band is painted with when it differs from `band` (translucent over a full photo). */
    bandBackground?: string;
    onBand: string;
    outline: string;
}) => {
    const hasTown = townText !== undefined;

    return (
        <>
            <Abs
                x={BLOCK}
                y={BLOCK}
                w={w - 2 * BLOCK}
                h={BLOCK_HEIGHT}
                style={{
                    background: bandBackground,
                    boxSizing: 'border-box',
                    border: `0.25mm solid ${outline}`,
                }}
                slot="band"
            />
            <FitText
                text={label.toUpperCase()}
                x={BLOCK + 2}
                y={BLOCK + 1.6}
                w={w - 2 * BLOCK - 4}
                h={3.2}
                maxFontMm={2.3}
                minFontMm={1.6}
                font="body"
                weight={600}
                color={onBand}
                align="center"
                slot="label"
            />
            {hasTown && (
                <FitText
                    text={townText}
                    x={BLOCK + 2}
                    y={BLOCK + 4.6}
                    w={w - 2 * BLOCK - 4}
                    h={3}
                    maxFontMm={2.4}
                    minFontMm={1.6}
                    font="body"
                    color={onBand}
                    align="center"
                    slot="town"
                />
            )}
            <FitText
                text={title.toUpperCase()}
                x={BLOCK + 2}
                y={BLOCK + (hasTown ? 7.6 : 5.2)}
                w={w - 2 * BLOCK - 4}
                h={hasTown ? 8 : 10}
                maxFontMm={4.8}
                minFontMm={2.2}
                wrap="words"
                font="heading"
                weight={700}
                color={onBand}
                align="center"
                lineHeight={1.05}
                slot="name"
            />
        </>
    );
};

const DeedBack = ({
    space,
    w,
    h,
    name,
    town,
    icon,
    story,
    bleed,
}: {
    space: OwnableSpace;
    w: number;
    h: number;
    name?: string;
    town?: string;
    icon?: SpaceIconSource;
    story?: string;
    bleed: number;
}) => {
    const { theme, locale, currency, words, style } = useRender();
    const deedStyle = partStyleOf(style, 'deeds');
    const street = space.type === 'street';
    const look = deedStyle === undefined ? undefined : deedLookOf(deedStyle);
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
    const valueTop = boxTop + (boxIcon === null ? 11 : 15.5);

    return (
        <>
            <DeedFrame
                deedStyle={deedStyle}
                w={w}
                h={h}
                seed={DEED_SEED + 40}
            />
            {deedStyle === undefined ? (
                <DeedHeader
                    w={w}
                    label={t.titleDeed}
                    title={name ?? space.name[locale]}
                    townText={townText}
                    band={band}
                    onBand={onBand}
                    outline={theme.deedFrame}
                />
            ) : (
                <StyledDeedHeader
                    style={deedStyle}
                    w={w}
                    block={BLOCK}
                    blockHeight={BLOCK_HEIGHT}
                    label={t.titleDeed}
                    title={name ?? space.name[locale]}
                    townText={townText}
                    band={band}
                    onBand={onBand}
                    street={street}
                    bleed={bleed}
                    seed={DEED_SEED + 40}
                />
            )}
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
                text={content.mortgage}
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
                text={t.mortgageBack(content.unmortgage)}
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
