import { standardEdition } from '@/lib/game/standard-edition';
import type { CornerSpace, Space } from '@/lib/game/types';
import {
    DEFAULT_BOARD_PROFILE,
    spaceWidth,
    type BoardProfile,
} from '@/lib/print/board';
import { withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { THEMES, type Layout, type Theme } from '@/lib/render/themes';

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

export interface BoardSpaceProps extends ElementProps {
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
}

/** Upright size of a space: the side along the board edge by the depth towards the centre. */
export function spaceSize(
    space: Space,
    profile: BoardProfile,
): { w: number; h: number } {
    return space.type === 'corner'
        ? { w: profile.corner, h: profile.corner }
        : { w: spaceWidth(profile), h: profile.corner };
}

function groupColor(group: string, theme: Theme): string {
    return (
        theme.groupColors?.[group] ??
        standardEdition.groups.find((candidate) => candidate.id === group)
            ?.color ??
        '#CFC6B2'
    );
}

/** One space of the board, drawn upright. The board places and rotates it (see `Board`). */
export function BoardSpace({
    space,
    profile = DEFAULT_BOARD_PROFILE,
    name,
    town,
    text,
    photo,
    icon,
    frame = true,
    ...element
}: BoardSpaceProps) {
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

    return (
        <Sheet
            {...element}
            element={`space-${space.type}`}
            widthMm={w}
            heightMm={h}
            background={background}
        >
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
            {frame && (
                <Frame
                    x={0}
                    y={0}
                    w={w}
                    h={h}
                    color={theme.line}
                    strokeMm={0.2}
                />
            )}
        </Sheet>
    );
}

interface ContentProps {
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
}

function SpaceContent({
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
}: ContentProps) {
    const { theme, locale, money, words, style } = useRender();
    const t = STRINGS[locale];
    const title =
        name ??
        (space.type === 'chance' || space.type === 'chest'
            ? words.decks?.[space.type]
            : undefined) ??
        space.name[locale];

    // A tax space has no icon of its own; a chosen one goes below the amount (B136).
    const taxIconSize = Math.max(0, Math.min(w - 12, 18, h * 0.55 - 18));

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
            const townHeight =
                townText === undefined || townText === '' ? 0 : 3.4;
            const nameTop = bar + 2 + townHeight;
            const nameHeight = 13 - townHeight;
            const priceTop = h - 9;
            const mediaTop = bar + 2 + 13 + 1;
            const mediaHeight = priceTop - 1 - mediaTop;
            // Framed without a photo would leave a blank hole: a street then
            // gets a larger name, stations and utilities their icon.
            const bigName = space.type === 'street' && layout === 'text';
            const iconSize = Math.min(w - 14, mediaHeight, 24);
            const barBottom = space.type === 'street' ? bar : 0;
            const icon =
                space.type === 'station'
                    ? 'train'
                    : space.position === 12
                      ? 'bulb'
                      : 'tap';

            if (full) {
                return (
                    <FullSpace
                        space={space}
                        bleed={bleed}
                        w={w}
                        h={h}
                        bar={barBottom}
                        title={title}
                        town={townText}
                        price={money(space.price)}
                        photo={photo}
                    />
                );
            }

            return (
                <>
                    {space.type === 'street' && (
                        <Abs
                            x={-bleed}
                            y={-bleed}
                            w={w + 2 * bleed}
                            h={bar + bleed}
                            style={{
                                background:
                                    style?.groupColors?.[space.group] ??
                                    groupColor(space.group, theme),
                                borderBottom: `${theme.frameMm}mm solid ${theme.ink}`,
                                boxSizing: 'border-box',
                            }}
                            slot="color-bar"
                        />
                    )}
                    {townText !== undefined && townHeight > 0 && (
                        <FitText
                            text={townText}
                            x={2}
                            y={bar + 1.6}
                            w={w - 4}
                            h={townHeight}
                            maxFontMm={2.4}
                            minFontMm={1.6}
                            font="body"
                            weight={600}
                            align="center"
                            slot="town"
                        />
                    )}
                    <FitText
                        text={title}
                        x={2}
                        y={nameTop}
                        w={w - 4}
                        h={bigName ? priceTop - 1 - nameTop : nameHeight}
                        maxFontMm={bigName ? 5.6 : layout === 'text' ? 5 : 4.2}
                        minFontMm={2}
                        wrap="words"
                        font="heading"
                        align="center"
                        slot="name"
                    />
                    {layout === 'framed' && (
                        <PhotoSlot
                            x={2}
                            y={mediaTop}
                            w={w - 4}
                            h={mediaHeight}
                            photo={photo}
                        />
                    )}
                    {space.type !== 'street' && layout === 'text' && (
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
                    <FitText
                        text={money(space.price)}
                        x={2}
                        y={priceTop}
                        w={w - 4}
                        h={7}
                        maxFontMm={3.6}
                        minFontMm={2}
                        font="body"
                        weight={600}
                        align="center"
                        slot="price"
                    />
                </>
            );
        }

        case 'tax':
            return (
                <>
                    <FitText
                        text={title}
                        x={2}
                        y={4}
                        w={w - 4}
                        h={18}
                        maxFontMm={4.2}
                        minFontMm={2}
                        wrap="words"
                        font="heading"
                        align="center"
                        slot="name"
                    />
                    <FitText
                        text={t.pay(money(space.amount))}
                        x={2}
                        y={h * 0.45}
                        w={w - 4}
                        h={14}
                        maxFontMm={4}
                        minFontMm={2}
                        wrap="words"
                        font="body"
                        weight={600}
                        align="center"
                        slot="amount"
                    />
                    {chosenIcon !== undefined && (
                        <SpaceIconArt
                            icon={chosenIcon}
                            fallback={null}
                            x={(w - taxIconSize) / 2}
                            y={h * 0.45 + 15}
                            size={taxIconSize}
                            color={theme.ink}
                            strokeWidth={1.5}
                        />
                    )}
                </>
            );

        case 'chance':
        case 'chest':
            return (
                <>
                    <FitText
                        text={title}
                        x={2}
                        y={4}
                        w={w - 4}
                        h={12}
                        maxFontMm={4.2}
                        minFontMm={2}
                        wrap="words"
                        font="heading"
                        align="center"
                        slot="name"
                    />
                    <SpaceIconArt
                        icon={chosenIcon}
                        fallback={space.type === 'chance' ? 'dice' : 'chest'}
                        x={(w - 22) / 2}
                        y={h * 0.4}
                        size={22}
                        color={theme.deckAccent[space.type]}
                        strokeWidth={1.5}
                    />
                </>
            );
    }
}

interface CornerContentProps {
    space: CornerSpace;
    size: number;
    name: string;
    text?: string;
    layout: Layout;
    photo?: PhotoSource;
    icon?: SpaceIconSource;
    money: (amount: number) => string;
}

function CornerContent({
    space,
    size,
    name,
    text,
    layout,
    photo,
    icon,
    money,
}: CornerContentProps) {
    const { theme, locale } = useRender();
    const t = STRINGS[locale];
    const c = size;
    const inset =
        layout === 'framed' ? (
            <PhotoSlot
                x={c * 0.12}
                y={c * 0.3}
                w={c * 0.76}
                h={c * 0.4}
                photo={photo}
            />
        ) : null;

    switch (space.corner) {
        case 'start':
            return (
                <>
                    <FitText
                        text={name}
                        x={3}
                        y={5}
                        w={c - 6}
                        h={18}
                        maxFontMm={9}
                        minFontMm={3}
                        font="heading"
                        align="center"
                        slot="name"
                    />
                    {inset ?? (
                        <SpaceIconArt
                            icon={icon}
                            fallback="arrow-left"
                            x={c / 2 - 12}
                            y={26}
                            size={24}
                            color={theme.secondaryAccent}
                            strokeWidth={2.4}
                        />
                    )}
                    <FitText
                        text={text ?? t.startSalary(money(space.salary ?? 0))}
                        x={5}
                        y={c - 17}
                        w={c - 10}
                        h={14}
                        maxFontMm={3.2}
                        minFontMm={2}
                        wrap="words"
                        font="body"
                        weight={600}
                        align="center"
                        slot="salary"
                    />
                </>
            );

        case 'jail':
            return (
                <>
                    <Abs
                        x={c * 0.06}
                        y={c * 0.06}
                        w={c * 0.56}
                        h={c * 0.56}
                        style={{
                            background: theme.paper,
                            boxSizing: 'border-box',
                            border: `${theme.frameMm}mm solid ${theme.ink}`,
                        }}
                    >
                        {layout === 'framed' ? (
                            <PhotoSlot
                                x={3}
                                y={2.5}
                                w={c * 0.56 - 6}
                                h={14}
                                photo={photo}
                            />
                        ) : (
                            <SpaceIconArt
                                icon={icon}
                                fallback="bars"
                                x={c * 0.28 - 8}
                                y={c * 0.06}
                                size={16}
                                color={theme.ink}
                            />
                        )}
                    </Abs>
                    <FitText
                        text={text ?? t.inJail}
                        x={c * 0.06}
                        y={c * 0.06 + 18}
                        w={c * 0.56}
                        h={9}
                        maxFontMm={3.6}
                        minFontMm={2}
                        font="heading"
                        align="center"
                        slot="in-jail"
                    />
                    <FitText
                        text={name}
                        x={3}
                        y={c - 13}
                        w={c - 6}
                        h={10}
                        maxFontMm={3.8}
                        minFontMm={2}
                        font="heading"
                        align="center"
                        slot="name"
                    />
                </>
            );

        case 'parking':
            return (
                <>
                    <FitText
                        text={name}
                        x={3}
                        y={5}
                        w={c - 6}
                        h={16}
                        maxFontMm={6}
                        minFontMm={3}
                        wrap="words"
                        font="heading"
                        align="center"
                        slot="name"
                    />
                    {inset ?? (
                        <SpaceIconArt
                            icon={icon}
                            fallback="car"
                            x={c / 2 - 13}
                            y={30}
                            size={26}
                            color={theme.ink}
                        />
                    )}
                    {text !== undefined && (
                        <FitText
                            text={text}
                            x={5}
                            y={c - 12}
                            w={c - 10}
                            h={9}
                            maxFontMm={3.2}
                            minFontMm={2}
                            wrap="words"
                            font="body"
                            weight={600}
                            align="center"
                            slot="text"
                        />
                    )}
                </>
            );

        case 'gotojail':
            return (
                <>
                    <FitText
                        text={name}
                        x={3}
                        y={5}
                        w={c - 6}
                        h={22}
                        maxFontMm={6}
                        minFontMm={3}
                        wrap="words"
                        font="heading"
                        align="center"
                        slot="name"
                    />
                    {inset ?? (
                        <SpaceIconArt
                            icon={icon}
                            fallback="pointer"
                            x={c / 2 - 12}
                            y={34}
                            size={24}
                            color={theme.secondaryAccent}
                            strokeWidth={2.4}
                        />
                    )}
                    {text !== undefined && (
                        <FitText
                            text={text}
                            x={5}
                            y={c - 12}
                            w={c - 10}
                            h={9}
                            maxFontMm={3.2}
                            minFontMm={2}
                            wrap="words"
                            font="body"
                            weight={600}
                            align="center"
                            slot="text"
                        />
                    )}
                </>
            );
    }
}

interface FullSpaceProps {
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
}

/**
 * The photo fills the space under the colour bar (B124, after the town editions of the original game): the
 * name sits on a light band across the top of the photo and the price in white on a dark fade at the bottom.
 * The photo runs on into the bleed on the sides, the bottom and, without a bar, the top.
 */
function FullSpace({
    space,
    bleed,
    w,
    h,
    bar,
    title,
    town,
    price,
    photo,
}: FullSpaceProps) {
    const { theme } = useRender();
    const hasTown = town !== undefined && town !== '';
    const townHeight = hasTown ? 3.4 : 0;
    const bandHeight = 15.5;
    const photoTop = bar === 0 ? -bleed : bar;
    const scrimHeight = 15;

    return (
        <>
            {space.type === 'street' && (
                <Abs
                    x={-bleed}
                    y={-bleed}
                    w={w + 2 * bleed}
                    h={bar + bleed}
                    style={{
                        background: groupColor(space.group, theme),
                        borderBottom: `${theme.frameMm}mm solid ${theme.ink}`,
                        boxSizing: 'border-box',
                    }}
                    slot="color-bar"
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
            {hasTown && (
                <FitText
                    text={town}
                    x={2}
                    y={bar + 1.4}
                    w={w - 4}
                    h={townHeight}
                    maxFontMm={2.4}
                    minFontMm={1.6}
                    font="body"
                    weight={600}
                    align="center"
                    slot="town"
                />
            )}
            <FitText
                text={title}
                x={2}
                y={bar + 1.8 + townHeight}
                w={w - 4}
                h={bandHeight - 3.2 - townHeight}
                maxFontMm={4.2}
                minFontMm={2}
                wrap="words"
                font="heading"
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
                    font="body"
                    weight={600}
                    color="#FFFFFF"
                    align="center"
                    slot="price"
                />
            </Abs>
        </>
    );
}
