import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import type { Layout } from '@/lib/render/themes';
import type { DeckId, Space, TaxSpace } from '@/types/game';

import { useBoardLook } from './board-look';
import { EngravedOval } from './board-space-parts';
import { PropertyContent } from './board-space-property';
import { StyledDeck, StyledTax } from './board-space-styles';
import { CornerContent } from './corner-content';
import { FitText } from './fit-text';
import { Frame, useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

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

export const SpaceContent = ({
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
    const { locale, money, words } = useRender();
    const title =
        name ??
        (space.type === 'chance' || space.type === 'chest'
            ? words.decks?.[space.type]
            : undefined) ??
        space.name[locale];

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
        case 'utility':
            return (
                <PropertyContent
                    space={space}
                    bleed={bleed}
                    w={w}
                    h={h}
                    title={title}
                    town={town}
                    layout={layout}
                    full={full}
                    photo={photo}
                    chosenIcon={chosenIcon}
                />
            );

        case 'tax':
            return (
                <TaxContent
                    space={space}
                    w={w}
                    h={h}
                    title={title}
                    chosenIcon={chosenIcon}
                />
            );

        case 'chance':
        case 'chest':
            return (
                <DeckContent
                    deck={space.type}
                    w={w}
                    h={h}
                    title={title}
                    chosenIcon={chosenIcon}
                />
            );
    }
};

const TaxContent = ({
    space,
    w,
    h,
    title,
    chosenIcon,
}: {
    space: TaxSpace;
    w: number;
    h: number;
    title: string;
    chosenIcon?: SpaceIconSource;
}) => {
    const { locale, money } = useRender();
    const t = STRINGS[locale];
    const look = useBoardLook();

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

    return (
        <ClassicTax
            w={w}
            h={h}
            title={title}
            amount={t.pay(money(space.amount))}
            chosenIcon={chosenIcon}
        />
    );
};

const ClassicTax = ({
    w,
    h,
    title,
    amount,
    chosenIcon,
}: {
    w: number;
    h: number;
    title: string;
    amount: string;
    chosenIcon?: SpaceIconSource;
}) => {
    const { theme } = useRender();
    const caps = useBoardLook().name.caps;
    const ovalTop = h * 0.36;
    const ovalW = w - 6;
    const ovalH = Math.min(18, h * 0.27);
    const iconTop = ovalTop + ovalH + 2.5;
    const taxIconSize = Math.max(0, Math.min(w - 14, 16, h - iconTop - 4));

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
                text={amount}
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
};

const DeckContent = ({
    deck,
    w,
    h,
    title,
    chosenIcon,
}: {
    deck: DeckId;
    w: number;
    h: number;
    title: string;
    chosenIcon?: SpaceIconSource;
}) => {
    const { theme } = useRender();
    const look = useBoardLook();
    const caps = look.name.caps;

    if (look.style !== undefined) {
        return (
            <StyledDeck
                style={look.style}
                deck={deck}
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
                color={theme.deckAccent[deck]}
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
                fallback={deck === 'chance' ? 'dice' : 'chest'}
                x={(w - iconSize) / 2}
                y={16 + (h - 20 - iconSize) / 2}
                size={iconSize}
                color={theme.deckAccent[deck]}
                strokeWidth={1.5}
            />
        </>
    );
};
