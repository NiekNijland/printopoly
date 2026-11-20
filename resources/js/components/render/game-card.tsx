import { formatMoney, standardEdition } from '@/lib/game/standard-edition';
import type { Card, DeckId } from '@/lib/game/types';
import { mix } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { resolveLayout, THEMES, type Layout } from '@/lib/render/themes';

import { FitText } from './fit-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import { Icon } from './icons';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

export const CARD_SIZE_MM = standardEdition.components.cardSizeMm;

export interface GameCardProps extends ElementProps {
    deck: DeckId;
    side: 'front' | 'back';
    /** A card from the game data; its text is shown in the edition's language. */
    card?: Card;
    /** The edition's own text, replacing the text of `card`. */
    text?: string;
    /** Replaces the deck name ("Kans", "Algemeen Fonds"). */
    title?: string;
    layout?: Layout;
    photo?: PhotoSource;
    placeholder?: boolean;
    /** Name of the edition, printed small on the back. */
    edition?: string;
    /** Money on the card (B32): above 0 the player receives it, below 0 the player pays it. */
    amount?: number;
    /** Free layers on the back, in mm from the top left of the card. */
    layers?: readonly RenderLayer[];
}

function deckName(deck: DeckId, locale: 'nl' | 'en'): string {
    return (
        standardEdition.spaces.find((space) => space.type === deck)?.name[
            locale
        ] ?? deck
    );
}

/** A Chance or Community Chest card at 63 x 88 mm, front or back. */
export function GameCard({
    deck,
    side,
    card,
    text,
    title,
    layout,
    photo,
    placeholder = false,
    edition,
    amount,
    layers,
    ...element
}: GameCardProps) {
    const { w, h } = { w: CARD_SIZE_MM.width, h: CARD_SIZE_MM.height };
    const resolved = resolveLayout(element.theme, 'card', layout);
    const bleed = element.bleedMm ?? 0;
    const full = resolved === 'full' && photo !== undefined;

    return (
        <Sheet
            {...element}
            element={`card-${deck}-${side}`}
            widthMm={w}
            heightMm={h}
            background={THEMES[element.theme].deck[deck]}
            rounded
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
            <CardFace
                deck={deck}
                side={side}
                w={w}
                h={h}
                card={card}
                text={text}
                title={title}
                layout={resolved}
                photo={photo}
                placeholder={placeholder}
                edition={edition}
                amount={amount}
            />
            {side === 'back' && layers !== undefined && (
                <FreeLayers layers={layers} />
            )}
        </Sheet>
    );
}

interface FaceProps {
    deck: DeckId;
    side: 'front' | 'back';
    w: number;
    h: number;
    card?: Card;
    text?: string;
    title?: string;
    layout: Layout;
    photo?: PhotoSource;
    placeholder: boolean;
    edition?: string;
    amount?: number;
}

/** Margin between the trim edge and the content, in mm. */
const M = 4.5;

function CardFace({
    deck,
    side,
    w,
    h,
    card,
    text,
    title,
    layout: requested,
    photo,
    placeholder,
    edition,
    amount,
}: FaceProps) {
    // A full-bleed layout without a photo reads as the text layout.
    const layout =
        requested === 'full' && photo === undefined ? 'text' : requested;
    const { theme, locale, currency } = useRender();
    const name = title ?? deckName(deck, locale);
    const body = text ?? card?.text[locale] ?? '';
    const full = layout === 'full' && photo !== undefined;
    const panel = { background: theme.paper, opacity: 0.92 };
    const tint = placeholder ? '#CFC6B2' : undefined;
    const accent = theme.deckAccent[deck];
    const iconName = deck === 'chance' ? 'dice' : 'chest';
    const hasMedia =
        layout === 'framed' && (photo !== undefined || placeholder);

    if (side === 'back') {
        // Without a photo the back is a centred stack: symbol, deck name, edition name.
        // With a photo the name moves up and the photo takes the space below it.
        const stacked = !hasMedia;
        const nameTop = stacked ? h / 2 - 9 : 9;
        const nameHeight = full ? 30 : stacked ? 16 : 14;

        return (
            <>
                {!full && (
                    <Frame
                        x={3}
                        y={3}
                        w={w - 6}
                        h={h - 6}
                        color={theme.ink}
                        strokeMm={theme.frameMm}
                        radiusMm={Math.max(0, theme.cardRadiusMm - 2)}
                    />
                )}
                {full && (
                    <Abs
                        x={4}
                        y={h * 0.5 - 16}
                        w={w - 8}
                        h={32}
                        style={panel}
                    />
                )}
                {stacked && !full && (
                    <Icon
                        name={iconName}
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
                    y={full ? h * 0.5 - 15 : nameTop}
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
                {stacked &&
                    !full &&
                    edition !== undefined &&
                    edition !== '' && (
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
                {layout === 'framed' && hasMedia && (
                    <PhotoSlot
                        x={8}
                        y={26}
                        w={w - 16}
                        h={h - 26 - 12}
                        photo={photo}
                        placeholder={tint}
                    />
                )}
            </>
        );
    }

    const artTop = 16;
    const artHeight = 28;
    const bodyTop = layout === 'framed' ? artTop + artHeight + 3.5 : 17;
    const hasAmount = amount !== undefined && amount !== 0;
    const amountHeight = hasAmount ? 10 : 0;
    const bodyHeight =
        (layout === 'framed' ? h - bodyTop - M : layout === 'text' ? 49 : 0) -
        (layout === 'text' || layout === 'framed' ? amountHeight : 0);
    const amountText = hasAmount
        ? (amount > 0 ? STRINGS[locale].receive : STRINGS[locale].pay)(
              formatMoney(Math.abs(amount), currency, locale),
          )
        : '';

    return (
        <>
            {full && <Abs x={0} y={4} w={w} h={11} style={panel} />}
            <FitText
                text={name}
                x={M}
                y={4.5}
                w={w - 2 * M}
                h={10}
                maxFontMm={8}
                minFontMm={2.5}
                font="heading"
                align="left"
                slot="title"
            />
            {layout === 'framed' && (
                <>
                    <Abs
                        x={M}
                        y={artTop}
                        w={w - 2 * M}
                        h={artHeight}
                        style={{
                            background: mix(theme.deck[deck], accent, 0.35),
                            boxSizing: 'border-box',
                            border: `0.3mm solid ${theme.ink}`,
                        }}
                        slot="art"
                    />
                    {hasMedia ? (
                        <PhotoSlot
                            x={M}
                            y={artTop}
                            w={w - 2 * M}
                            h={artHeight}
                            photo={photo}
                            placeholder={tint}
                        />
                    ) : (
                        <Icon
                            name={iconName}
                            x={w / 2 - 9}
                            y={artTop + artHeight / 2 - 9}
                            size={18}
                            color={theme.ink}
                            strokeWidth={1.3}
                        />
                    )}
                </>
            )}
            {layout === 'text' && !hasAmount && (
                <Icon
                    name={iconName}
                    x={w / 2 - 7}
                    y={h - M - 14}
                    size={14}
                    color={accent}
                    strokeWidth={1.4}
                />
            )}
            {full && <Abs x={0} y={h - 45} w={w} h={41} style={panel} />}
            <FitText
                text={body}
                x={M + (full ? 2.5 : 0)}
                y={full ? h - 44 : bodyTop}
                w={w - 2 * M - (full ? 5 : 0)}
                h={full ? 39 : bodyHeight}
                maxFontMm={layout === 'text' ? 5 : 4}
                minFontMm={2.2}
                wrap="words"
                font="body"
                align="left"
                valign={full ? 'middle' : 'top'}
                lineHeight={1.3}
                slot="text"
            />
            {hasAmount && (
                <>
                    <Abs
                        x={M}
                        y={h - M - 9}
                        w={w - 2 * M}
                        h={0}
                        style={{ borderTop: `0.3mm solid ${theme.ink}` }}
                    />
                    <FitText
                        text={amountText}
                        x={M}
                        y={h - M - 8}
                        w={w - 2 * M}
                        h={8}
                        maxFontMm={5.5}
                        minFontMm={3}
                        font="heading"
                        align="center"
                        slot="amount"
                    />
                </>
            )}
        </>
    );
}
