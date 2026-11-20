import { standardEdition, formatMoney } from '@/lib/game/standard-edition';
import type { CornerSpace, Space } from '@/lib/game/types';
import {
    DEFAULT_BOARD_PROFILE,
    spaceWidth,
    type BoardProfile,
} from '@/lib/print/board';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { resolveLayout, THEMES, type Layout } from '@/lib/render/themes';

import { FitText } from './fit-text';
import { Icon } from './icons';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

export interface BoardSpaceProps extends ElementProps {
    space: Space;
    profile?: BoardProfile;
    /** Replaces the name from the game data (the edition's own name for this space). */
    name?: string;
    layout?: Layout;
    photo?: PhotoSource;
    /** Show a flat tint where the photo will go (the editor). */
    placeholder?: boolean;
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

function groupColor(group: string): string {
    return (
        standardEdition.groups.find((candidate) => candidate.id === group)
            ?.color ?? '#CFC6B2'
    );
}

/** One space of the board, drawn upright. The board places and rotates it (see `Board`). */
export function BoardSpace({
    space,
    profile = DEFAULT_BOARD_PROFILE,
    name,
    layout,
    photo,
    placeholder = false,
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
    const resolved = hasPhoto
        ? resolveLayout(element.theme, 'space', layout)
        : 'text';
    const full = resolved === 'full' && photo !== undefined;
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
            underlay={
                full ? (
                    <PhotoSlot
                        x={0}
                        y={0}
                        w={w + 2 * bleed}
                        h={h + 2 * bleed}
                        photo={photo}
                    />
                ) : undefined
            }
        >
            <SpaceContent
                space={space}
                w={w}
                h={h}
                name={name}
                layout={resolved}
                photo={photo}
                placeholder={placeholder}
            />
            <Frame x={0} y={0} w={w} h={h} color={theme.line} strokeMm={0.2} />
        </Sheet>
    );
}

interface ContentProps {
    space: Space;
    w: number;
    h: number;
    name?: string;
    layout: Layout;
    photo?: PhotoSource;
    placeholder: boolean;
}

function SpaceContent({
    space,
    w,
    h,
    name,
    layout,
    photo,
    placeholder,
}: ContentProps) {
    const { theme, locale, currency } = useRender();
    const t = STRINGS[locale];
    const title = name ?? space.name[locale];
    const money = (amount: number) => formatMoney(amount, currency, locale);

    switch (space.type) {
        case 'corner':
            return (
                <CornerContent
                    space={space}
                    size={w}
                    name={title}
                    layout={layout}
                    photo={photo}
                    placeholder={placeholder}
                    money={money}
                />
            );

        case 'street':
        case 'station':
        case 'utility': {
            const bar = space.type === 'street' ? h * 0.2 : 0;
            const nameTop = bar + 2;
            const nameHeight = 13;
            const priceTop = h - 9;
            const mediaTop = nameTop + nameHeight + 1;
            const mediaHeight = priceTop - 1 - mediaTop;
            const full = layout === 'full';
            const strip = { background: theme.paper, opacity: 0.92 };
            const icon =
                space.type === 'station'
                    ? 'train'
                    : space.position === 12
                      ? 'bulb'
                      : 'tap';

            return (
                <>
                    {full && (
                        <Abs
                            x={0}
                            y={nameTop - 1}
                            w={w}
                            h={nameHeight + 2}
                            style={strip}
                        />
                    )}
                    {full && (
                        <Abs
                            x={0}
                            y={priceTop - 1}
                            w={w}
                            h={h - priceTop + 1}
                            style={strip}
                        />
                    )}
                    {space.type === 'street' && (
                        <Abs
                            x={0}
                            y={0}
                            w={w}
                            h={bar}
                            style={{
                                background: groupColor(space.group),
                                borderBottom: `${theme.frameMm}mm solid ${theme.ink}`,
                                boxSizing: 'border-box',
                            }}
                            slot="color-bar"
                        />
                    )}
                    <FitText
                        text={title}
                        x={2}
                        y={nameTop}
                        w={w - 4}
                        h={nameHeight}
                        maxFontMm={layout === 'text' ? 5 : 4.2}
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
                            placeholder={placeholder ? '#CFC6B2' : undefined}
                        />
                    )}
                    {space.type !== 'street' &&
                        (layout === 'text' ||
                            (layout === 'framed' &&
                                photo === undefined &&
                                !placeholder)) && (
                            <Icon
                                name={icon}
                                x={(w - Math.min(w - 10, mediaHeight)) / 2}
                                y={
                                    mediaTop +
                                    (mediaHeight -
                                        Math.min(w - 10, mediaHeight)) /
                                        2
                                }
                                size={Math.min(w - 10, mediaHeight)}
                                color={theme.ink}
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
                    {space.type === 'chance' ? (
                        <FitText
                            text="?"
                            x={2}
                            y={h * 0.3}
                            w={w - 4}
                            h={h * 0.5}
                            maxFontMm={26}
                            minFontMm={10}
                            font="heading"
                            color={theme.deckAccent.chance}
                            align="center"
                            slot="symbol"
                        />
                    ) : (
                        <Icon
                            name="chest"
                            x={(w - 22) / 2}
                            y={h * 0.4}
                            size={22}
                            color={theme.deckAccent.chest}
                        />
                    )}
                </>
            );
    }
}

interface CornerContentProps {
    space: CornerSpace;
    size: number;
    name: string;
    layout: Layout;
    photo?: PhotoSource;
    placeholder: boolean;
    money: (amount: number) => string;
}

function CornerContent({
    space,
    size,
    name,
    layout,
    photo,
    placeholder,
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
                placeholder={placeholder ? '#CFC6B2' : undefined}
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
                        <Icon
                            name="arrow-left"
                            x={c / 2 - 12}
                            y={26}
                            size={24}
                            color={theme.secondaryAccent}
                            strokeWidth={2.4}
                        />
                    )}
                    <FitText
                        text={t.startSalary(money(space.salary ?? 0))}
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
                        <Icon
                            name="bars"
                            x={c * 0.28 - 8}
                            y={c * 0.06}
                            size={16}
                            color={theme.ink}
                        />
                    </Abs>
                    <FitText
                        text={t.inJail}
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
                        <Icon
                            name="car"
                            x={c / 2 - 13}
                            y={30}
                            size={26}
                            color={theme.ink}
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
                        <Icon
                            name="pointer"
                            x={c / 2 - 12}
                            y={34}
                            size={24}
                            color={theme.secondaryAccent}
                            strokeWidth={2.4}
                        />
                    )}
                </>
            );
    }
}
