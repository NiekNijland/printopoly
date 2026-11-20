import { standardEdition } from '@/lib/game/standard-edition';
import type { Card, DeckId } from '@/lib/game/types';
import type { PhotoSource } from '@/lib/render/photo';
import { resolveLayout, THEMES, type Layout } from '@/lib/render/themes';

import { FitText } from './fit-text';
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
            />
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
}

function CardFace({
    deck,
    side,
    w,
    h,
    card,
    text,
    title,
    layout,
    photo,
    placeholder,
}: FaceProps) {
    const { theme, locale } = useRender();
    const name = title ?? deckName(deck, locale);
    const body = text ?? card?.text[locale] ?? '';
    const full = layout === 'full' && photo !== undefined;
    const panel = { background: theme.paper, opacity: 0.92 };
    const tint = placeholder ? '#CFC6B2' : undefined;
    const mark =
        deck === 'chance' ? (
            <FitText
                text="?"
                x={4}
                y={h * 0.5 - 14}
                w={w - 8}
                h={28}
                maxFontMm={30}
                minFontMm={10}
                font="heading"
                color={theme.deckAccent.chance}
                align="center"
                slot="symbol"
            />
        ) : (
            <Icon
                name="chest"
                x={w / 2 - 12}
                y={h * 0.5 - 12}
                size={24}
                color={theme.deckAccent.chest}
            />
        );

    if (side === 'back') {
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
                <FitText
                    text={name}
                    x={6}
                    y={h * 0.5 - 15}
                    w={w - 12}
                    h={full ? 30 : 14}
                    maxFontMm={9}
                    minFontMm={3}
                    wrap="words"
                    font="heading"
                    align="center"
                    valign={full ? 'middle' : 'bottom'}
                    slot="title"
                />
                {layout === 'framed' && (
                    <PhotoSlot
                        x={8}
                        y={h * 0.5 + 2}
                        w={w - 16}
                        h={h * 0.5 - 14}
                        photo={photo}
                        placeholder={tint}
                    />
                )}
                {(layout === 'text' ||
                    (layout === 'framed' &&
                        photo === undefined &&
                        !placeholder)) &&
                    mark}
            </>
        );
    }

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
            {full && <Abs x={0} y={4} w={w} h={11} style={panel} />}
            <FitText
                text={name}
                x={6}
                y={5}
                w={w - 12}
                h={9}
                maxFontMm={5.5}
                minFontMm={2.5}
                font="heading"
                align="center"
                slot="title"
            />
            <Abs
                x={w / 2 - 8}
                y={15}
                w={16}
                h={0.8}
                style={{ background: theme.deckAccent[deck] }}
            />
            {layout === 'framed' && (
                <PhotoSlot
                    x={7}
                    y={19}
                    w={w - 14}
                    h={24}
                    photo={photo}
                    placeholder={tint}
                />
            )}
            {full && <Abs x={0} y={h - 45} w={w} h={41} style={panel} />}
            <FitText
                text={body}
                x={7}
                y={layout === 'framed' ? 46 : full ? h - 44 : 20}
                w={w - 14}
                h={layout === 'framed' ? h - 46 - 8 : full ? 39 : h - 20 - 8}
                maxFontMm={layout === 'text' ? 4.6 : 3.8}
                minFontMm={2.2}
                wrap="words"
                font="body"
                align="center"
                slot="text"
            />
        </>
    );
}
