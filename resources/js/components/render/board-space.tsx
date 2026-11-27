import { mix, readableOn, withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import {
    DEFAULT_BOARD_PROFILE,
    spaceWidth,
    type BoardProfile,
} from '@/lib/render/print-board';
import { standardEdition } from '@/lib/render/standard-edition';
import { STRINGS } from '@/lib/render/strings';
import { partStyleOf } from '@/lib/render/style';
import { THEMES, type Layout, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import type { Space } from '@/types/game';

import {
    PlayfulTile,
    TILE_GAP,
    TILE_RADIUS,
    VintageRules,
    boardLookOf,
    ruleColor,
    spacePaper,
    useBoardLook,
} from './board-look';
import { StyledDeck, StyledProperty, StyledTax } from './board-space-styles';
import { CornerContent } from './corner-content';
import { FitText } from './fit-text';
import {
    BAND_OPACITY,
    BOTTOM_SCRIM,
    LIGHT_TEXT_SHADOW,
    PhotoSlot,
    isFullPhoto,
} from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

export type BoardSpaceProps = {
    space: Space;
    profile?: BoardProfile;
    /** Replaces the name from the game data (the edition's own name for this space). */
    name?: string;
    /** Town of the colour group; shown small above the name of a street. */
    town?: string;
    /** Replaces the short text of a corner: the salary line on Start, the label in the jail, a line under the others. */
    text?: string;
    photo?: PhotoSource;
    /** The chosen icon or uploaded image of a special space (B136); without it the standard icon. */
    icon?: SpaceIconSource;
    /** Draw the thin line around the space; home stickers have none (B65). Default true. */
    frame?: boolean;
    /**
     * Sides of the upright space without that line, because they lie on the cut edge of the board (B253, Ingrid: a
     * line on the trim shows half or not at all when the knife moves half a millimetre).
     */
    openSides?: readonly SpaceSide[];
} & ElementProps;

export type SpaceSide = 'top' | 'right' | 'bottom' | 'left';

/** Upright size of a space: the side along the board edge by the depth towards the centre. */
export const spaceSize = (
    space: Space,
    profile: BoardProfile,
): { w: number; h: number } => {
    return space.type === 'corner'
        ? { w: profile.corner, h: profile.corner }
        : { w: spaceWidth(profile), h: profile.corner };
};

const groupColor = (group: string, theme: Theme): string => {
    return (
        theme.groupColors?.[group] ??
        standardEdition.groups.find((candidate) => candidate.id === group)
            ?.color ??
        '#CFC6B2'
    );
};

/** One space of the board, drawn upright. The board places and rotates it (see `Board`). */
export const BoardSpace = ({
    space,
    profile = DEFAULT_BOARD_PROFILE,
    name,
    town,
    text,
    photo,
    icon,
    frame = true,
    openSides = [],
    ...element
}: BoardSpaceProps) => {
    const { w, h } = spaceSize(space, profile);
    const theme = THEMES[element.theme];
    const bleed = element.bleedMm ?? 0;
    const isCorner = space.type === 'corner';
    const hasPhoto =
        space.type === 'street' ||
        space.type === 'station' ||
        space.type === 'utility' ||
        isCorner;
    // The layout follows the photo: with one the space shows it in a frame, without it is text only.
    const resolved: Layout =
        hasPhoto && photo !== undefined ? 'framed' : 'text';
    // "Full" is for streets, stations and utilities; a corner always keeps its framed photo (B124).
    const full = !isCorner && hasPhoto && isFullPhoto(photo);
    const background =
        space.type === 'chance' || space.type === 'chest'
            ? theme.deck[space.type]
            : isCorner
              ? theme.cornerBackground
              : theme.boardBackground;
    // The style of the board (B268): absent draws the theme exactly as before.
    const look = boardLookOf(theme, partStyleOf(element.style, 'board'));
    const paper = spacePaper(theme, look.style, background);
    const playful = look.style === 'playful';
    const content = (
        <SpaceContent
            space={space}
            bleed={bleed}
            w={w}
            h={h}
            name={name}
            town={town}
            text={text}
            layout={resolved}
            full={full}
            photo={photo}
            icon={icon}
        />
    );

    return (
        <Sheet
            {...element}
            element={`space-${space.type}`}
            widthMm={w}
            heightMm={h}
            // Speels lays a tile on the board colour; the board shows in the gap around it.
            background={playful ? theme.boardBackground : paper}
        >
            {playful && (
                <PlayfulTile
                    w={w}
                    h={h}
                    fill={
                        background === theme.boardBackground
                            ? mix(theme.paper, background, 0.25)
                            : background
                    }
                    ink={theme.ink}
                    seed={space.position + 1}
                />
            )}
            {look.style === 'vintage' && !full && (
                <VintageRules
                    w={w}
                    h={h}
                    color={ruleColor(theme)}
                    ornaments={isCorner}
                />
            )}
            {playful && full ? (
                // Speels keeps a photo over the whole space inside its tile, with the hand-drawn edge on top.
                <>
                    <div
                        style={{
                            position: 'absolute',
                            left: mm(TILE_GAP),
                            top: mm(TILE_GAP),
                            width: mm(w - 2 * TILE_GAP),
                            height: mm(h - 2 * TILE_GAP),
                            borderRadius: mm(TILE_RADIUS),
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                left: mm(-TILE_GAP),
                                top: mm(-TILE_GAP),
                                width: mm(w),
                                height: mm(h),
                            }}
                        >
                            {content}
                        </div>
                    </div>
                    <PlayfulTile
                        w={w}
                        h={h}
                        fill="none"
                        ink={theme.ink}
                        seed={space.position + 1}
                    />
                </>
            ) : (
                content
            )}
            {frame && !playful && openSides.length === 0 && (
                <Frame
                    x={0}
                    y={0}
                    w={w}
                    h={h}
                    color={theme.line}
                    strokeMm={0.2}
                />
            )}
            {frame && !playful && openSides.length > 0 && (
                <SideLines
                    w={w}
                    h={h}
                    color={theme.line}
                    strokeMm={0.2}
                    open={openSides}
                />
            )}
        </Sheet>
    );
};

type ContentProps = {
    space: Space;
    /** Bleed around the space; the colour bar runs on into it. */
    bleed: number;
    w: number;
    h: number;
    name?: string;
    town?: string;
    text?: string;
    layout: Layout;
    /** The photo fills the space below the colour bar, with the name and price on it (B124). */
    full: boolean;
    photo?: PhotoSource;
    icon?: SpaceIconSource;
};

const SpaceContent = ({
    space,
    bleed,
    w,
    h,
    name,
    town,
    text,
    layout,
    full,
    photo,
    icon: chosenIcon,
}: ContentProps) => {
    const { theme, locale, money, words, style } = useRender();
    const t = STRINGS[locale];
    const title =
        name ??
        (space.type === 'chance' || space.type === 'chest'
            ? words.decks?.[space.type]
            : undefined) ??
        space.name[locale];

    const look = useBoardLook();
    const caps = look.name.caps;

    switch (space.type) {
        case 'corner':
            return (
                <CornerContent
                    space={space}
                    size={w}
                    name={title}
                    text={text}
                    layout={layout}
                    photo={photo}
                    icon={chosenIcon}
                    money={money}
                />
            );

        case 'street':
        case 'station':
        case 'utility': {
            const bar = space.type === 'street' ? h * 0.2 : 0;
            const townText = space.type === 'street' ? town?.trim() : undefined;
            const framed = layout === 'framed';
            const price = money(space.price);
            const icon =
                space.type === 'station'
                    ? 'train'
                    : space.position === 12
                      ? 'bulb'
                      : 'tap';

            if (look.style !== undefined && !full) {
                return (
                    <StyledProperty
                        style={look.style}
                        w={w}
                        h={h}
                        street={space.type === 'street'}
                        title={title}
                        town={townText}
                        price={price}
                        color={
                            space.type === 'street'
                                ? (style?.groupColors?.[space.group] ??
                                  groupColor(space.group, theme))
                                : theme.ink
                        }
                        photo={framed ? photo : undefined}
                        icon={chosenIcon}
                        fallbackIcon={icon}
                    />
                );
            }

            if (full) {
                return (
                    <FullSpace
                        space={space}
                        bleed={bleed}
                        w={w}
                        h={h}
                        bar={bar}
                        title={title}
                        town={townText}
                        price={price}
                        photo={photo}
                    />
                );
            }

            // The name sits right under the band, as on the classic board; with a photo it takes two lines at
            // most, so the photo is as large as the space allows (UX 4, ronde 4).
            const nameTop = bar + (framed ? 2 : bar > 0 ? 2.4 : 3.2);
            const nameHeight = framed ? 10 : h * (bar > 0 ? 0.36 : 0.22);
            const priceTop = h - (framed ? 7.5 : 8.2);
            const mediaTop = nameTop + nameHeight + (framed ? 0.5 : 1);
            const mediaHeight = priceTop - (framed ? 0.5 : 1.5) - mediaTop;
            const iconSize = Math.min(w - 12, mediaHeight, 24);

            return (
                <>
                    {space.type === 'street' && (
                        <ColorBand
                            bleed={bleed}
                            w={w}
                            bar={bar}
                            color={
                                style?.groupColors?.[space.group] ??
                                groupColor(space.group, theme)
                            }
                            town={townText}
                        />
                    )}
                    <FitText
                        text={title}
                        x={2}
                        y={nameTop}
                        w={w - 4}
                        h={nameHeight}
                        maxFontMm={framed ? 3.6 : 4.4}
                        minFontMm={2}
                        wrap="words"
                        font="heading"
                        caps={caps}
                        lineHeight={1.05}
                        align="center"
                        valign={framed ? 'middle' : 'top'}
                        slot="name"
                    />
                    {framed && (
                        <PhotoSlot
                            x={1.5}
                            y={mediaTop}
                            w={w - 3}
                            h={mediaHeight}
                            photo={photo}
                        />
                    )}
                    {space.type !== 'street' && !framed && (
                        <SpaceIconArt
                            icon={chosenIcon}
                            fallback={icon}
                            x={(w - iconSize) / 2}
                            y={mediaTop + (mediaHeight - iconSize) / 2}
                            size={iconSize}
                            color={theme.ink}
                            strokeWidth={1.5}
                        />
                    )}
                    <PriceLine
                        w={w}
                        top={priceTop}
                        text={price}
                        rule={!framed}
                    />
                </>
            );
        }

        case 'tax': {
            if (look.style !== undefined) {
                return (
                    <StyledTax
                        style={look.style}
                        w={w}
                        h={h}
                        title={title}
                        amount={t.pay(money(space.amount))}
                        icon={chosenIcon}
                    />
                );
            }
            const ovalTop = h * 0.36;
            const ovalW = w - 6;
            const ovalH = Math.min(18, h * 0.27);
            const iconTop = ovalTop + ovalH + 2.5;
            const taxIconSize = Math.max(
                0,
                Math.min(w - 14, 16, h - iconTop - 4),
            );

            return (
                <>
                    <FitText
                        text={title}
                        x={2}
                        y={3.2}
                        w={w - 4}
                        h={ovalTop - 5}
                        maxFontMm={4.2}
                        minFontMm={2}
                        wrap="words"
                        font="heading"
                        caps={caps}
                        lineHeight={1.05}
                        align="center"
                        slot="name"
                    />
                    <EngravedOval
                        x={3}
                        y={ovalTop}
                        w={ovalW}
                        h={ovalH}
                        color={theme.ink}
                        fill={theme.paper}
                    />
                    <FitText
                        text={t.pay(money(space.amount))}
                        x={3 + ovalW * 0.14}
                        y={ovalTop + 1.5}
                        w={ovalW * 0.72}
                        h={ovalH - 3}
                        maxFontMm={3.6}
                        minFontMm={2}
                        wrap="words"
                        font="body"
                        weight={600}
                        lineHeight={1.1}
                        align="center"
                        slot="amount"
                    />
                    {chosenIcon !== undefined && (
                        <SpaceIconArt
                            icon={chosenIcon}
                            fallback={null}
                            x={(w - taxIconSize) / 2}
                            y={iconTop}
                            size={taxIconSize}
                            color={theme.ink}
                            strokeWidth={1.5}
                        />
                    )}
                </>
            );
        }

        case 'chance':
        case 'chest': {
            if (look.style !== undefined) {
                return (
                    <StyledDeck
                        style={look.style}
                        deck={space.type}
                        w={w}
                        h={h}
                        title={title}
                        icon={chosenIcon}
                    />
                );
            }
            const iconSize = Math.min(w - 10, h * 0.4, 26);

            return (
                <>
                    <Frame
                        x={1.4}
                        y={1.4}
                        w={w - 2.8}
                        h={h - 2.8}
                        color={theme.deckAccent[space.type]}
                        strokeMm={0.2}
                        radiusMm={1}
                    />
                    <FitText
                        text={title}
                        x={3}
                        y={4}
                        w={w - 6}
                        h={12}
                        maxFontMm={4.2}
                        minFontMm={2}
                        wrap="words"
                        font="heading"
                        caps={caps}
                        lineHeight={1.05}
                        align="center"
                        slot="name"
                    />
                    <SpaceIconArt
                        icon={chosenIcon}
                        fallback={space.type === 'chance' ? 'dice' : 'chest'}
                        x={(w - iconSize) / 2}
                        y={16 + (h - 20 - iconSize) / 2}
                        size={iconSize}
                        color={theme.deckAccent[space.type]}
                        strokeWidth={1.5}
                    />
                </>
            );
        }
    }
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
const PriceLine = ({
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

/** An oval with a fine second line inside, like the value oval of a banknote. */
const EngravedOval = ({
    x,
    y,
    w,
    h,
    color,
    fill,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    fill: string;
}) => {
    return (
        <svg
            style={{
                position: 'absolute',
                left: mm(x),
                top: mm(y),
                width: mm(w),
                height: mm(h),
                overflow: 'visible',
            }}
            viewBox={`0 0 ${String(w)} ${String(h)}`}
            aria-hidden="true"
            data-slot="oval"
        >
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
        </svg>
    );
};

type FullSpaceProps = {
    space: Space;
    bleed: number;
    w: number;
    h: number;
    /** Height of the colour bar; 0 for stations and utilities, which have none. */
    bar: number;
    title: string;
    town?: string;
    price: string;
    photo?: PhotoSource;
};

/**
 * The photo fills the space under the colour bar (B124, after the town editions of the original game): the
 * name sits on a light band across the top of the photo and the price in white on a dark fade at the bottom.
 * The photo runs on into the bleed on the sides, the bottom and, without a bar, the top.
 */
const FullSpace = ({
    space,
    bleed,
    w,
    h,
    bar,
    title,
    town,
    price,
    photo,
}: FullSpaceProps) => {
    const { theme, style } = useRender();
    const look = useBoardLook();
    const bandHeight = 15.5;
    const photoTop = bar === 0 ? -bleed : bar;
    const scrimHeight = 15;
    const plate = Math.min(w - 3, 17);

    return (
        <>
            {space.type === 'street' && (
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
            )}
            <PhotoSlot
                x={-bleed}
                y={photoTop}
                w={w + 2 * bleed}
                h={h + bleed - photoTop}
                photo={photo}
            />
            <Abs
                x={-bleed}
                y={h - scrimHeight}
                w={w + 2 * bleed}
                h={scrimHeight + bleed}
                style={{ background: BOTTOM_SCRIM }}
                slot="scrim"
            />
            {/* A dark plate right behind the price, so it reads on a dark or busy photo too (ronde 3, UX 1). */}
            <Abs
                x={w / 2 - plate / 2}
                y={h - 8.5}
                w={plate}
                h={6}
                style={{
                    background: 'rgba(0, 0, 0, 0.62)',
                    borderRadius: mm(3),
                }}
                slot="price-plate"
            />
            <Abs
                x={-bleed}
                y={bar}
                w={w + 2 * bleed}
                h={bandHeight}
                style={{
                    background: withAlpha(theme.paper, BAND_OPACITY),
                    boxSizing: 'border-box',
                    borderBottom: `0.2mm solid ${theme.line}`,
                }}
                slot="name-band"
            />
            <FitText
                text={title}
                x={2}
                y={bar + 1.8}
                w={w - 4}
                h={bandHeight - 3.2}
                maxFontMm={3.8}
                minFontMm={2}
                wrap="words"
                {...look.name}
                lineHeight={1.05}
                align="center"
                slot="name"
            />
            <Abs
                x={0}
                y={0}
                w={w}
                h={h}
                style={{ textShadow: LIGHT_TEXT_SHADOW }}
            >
                <FitText
                    text={price}
                    x={2}
                    y={h - 9}
                    w={w - 4}
                    h={7}
                    maxFontMm={3.6}
                    minFontMm={2}
                    {...look.figure}
                    color="#FFFFFF"
                    align="center"
                    slot="price"
                />
            </Abs>
        </>
    );
};

/** The line around a space without the sides on the cut edge of the board. */
const SideLines = ({
    w,
    h,
    color,
    strokeMm,
    open,
}: {
    w: number;
    h: number;
    color: string;
    strokeMm: number;
    open: readonly SpaceSide[];
}) => {
    const half = strokeMm / 2;
    const sides: Record<SpaceSide, [number, number, number, number]> = {
        top: [0, half, w, half],
        right: [w - half, 0, w - half, h],
        bottom: [0, h - half, w, h - half],
        left: [half, 0, half, h],
    };
    const order: readonly SpaceSide[] = ['top', 'right', 'bottom', 'left'];

    return (
        <svg
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: mm(w),
                height: mm(h),
                overflow: 'visible',
            }}
            viewBox={`0 0 ${String(w)} ${String(h)}`}
            aria-hidden="true"
            data-frame=""
        >
            {order
                .filter((side) => !open.includes(side))
                .map((side) => {
                    const [x1, y1, x2, y2] = sides[side];

                    return (
                        <line
                            key={side}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={color}
                            strokeWidth={strokeMm}
                        />
                    );
                })}
        </svg>
    );
};
