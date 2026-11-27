import {
    cardTextContext,
    mapCardTextSegments,
    renderCardText,
} from '@/lib/render/edition-card-text';
import type { PatternId } from '@/lib/render/patterns';
import type { PhotoSource } from '@/lib/render/photo';
import { standardEdition, withCurrency } from '@/lib/render/standard-edition';
import { partStyleOf } from '@/lib/render/style';
import { THEMES } from '@/lib/render/themes';
import type { Card, CurrencyId, DeckId, Locale } from '@/types/game';

import { FreeLayers, type RenderLayer } from './free-layers';
import { CardBack } from './game-card-back';
import { CardFront } from './game-card-front';
import { cardPaper } from './game-card-styles';
import { Sheet, useRender, type ElementProps } from './sheet';
import type { SpaceIconSource } from './space-icon';

export const CARD_SIZE_MM = standardEdition.components.cardSizeMm;

export type GameCardProps = {
    deck: DeckId;
    side: 'front' | 'back';
    /** A card from the game data; its text is shown in the edition's language. */
    card?: Card;
    /** The edition's own text, replacing the text of `card`. */
    text?: string;
    /** Replaces the deck name ("Kans", "Algemeen Fonds"). */
    title?: string;
    photo?: PhotoSource;
    /** Name of the edition, printed small on the back. */
    edition?: string;
    /** Money on the card (B32): above 0 the player receives it, below 0 the player pays it. */
    amount?: number;
    /** What the amount is for: "Pay 50 for your language course". */
    purpose?: string;
    /** Free layers on the back, in mm from the top left of the card. */
    layers?: readonly RenderLayer[];
    /** Built-in pattern for the back; a photo wins over it (B130). */
    pattern?: PatternId;
    /** The icon or image of the Chance or Community Chest space (B136), on the standard back. */
    icon?: SpaceIconSource;
} & ElementProps;

/**
 * A standard card text drawn without an edition (a thumbnail, a landing page): the standard words and the
 * standard names of the spaces fill in the placeholders and variables (B126, B131).
 */
const standardCardText = (
    raw: string,
    locale: Locale,
    amount: number | undefined,
    currencyId: CurrencyId,
    symbol: string | undefined,
): string => {
    const currency =
        standardEdition.currencies.find((entry) => entry.id === currencyId) ??
        standardEdition.currencies[0];

    if (currency === undefined) {
        return raw;
    }

    // The currency sign goes before every amount, as on the real card (B132).
    const filled = mapCardTextSegments(raw, (plain) =>
        withCurrency(plain, currency.id, locale, symbol),
    );

    return renderCardText(
        filled,
        cardTextContext(
            { elements: {}, language: locale, currency: currency.id },
            amount,
            symbol,
        ),
    );
};

const deckName = (deck: DeckId, locale: 'nl' | 'en'): string => {
    return (
        standardEdition.spaces.find((space) => space.type === deck)?.name[
            locale
        ] ?? deck
    );
};

/** A Chance or Community Chest card at 63 x 88 mm, front or back. */
export const GameCard = ({
    deck,
    side,
    card,
    text,
    title,
    photo,
    edition,
    amount,
    purpose,
    layers,
    pattern,
    icon,
    ...element
}: GameCardProps) => {
    const { w, h } = { w: CARD_SIZE_MM.width, h: CARD_SIZE_MM.height };
    // A style of its own for the cards (B269) brings its own paper, into the bleed.
    const cardStyle = partStyleOf(element.style, 'cards');
    const theme = THEMES[element.theme];

    return (
        <Sheet
            {...element}
            element={`card-${deck}-${side}`}
            widthMm={w}
            heightMm={h}
            background={
                cardStyle === undefined ||
                (side === 'back' &&
                    (photo !== undefined || pattern !== undefined))
                    ? theme.deck[deck]
                    : cardPaper(theme, cardStyle, deck, side)
            }
            rounded
        >
            <CardFace
                deck={deck}
                side={side}
                w={w}
                h={h}
                card={card}
                text={text}
                title={title}
                photo={photo}
                edition={edition}
                amount={amount}
                purpose={purpose}
                pattern={pattern}
                icon={icon}
                bleed={element.bleedMm ?? 0}
            />
            {side === 'back' && layers !== undefined && (
                <FreeLayers layers={layers} />
            )}
        </Sheet>
    );
};

type FaceProps = {
    deck: DeckId;
    side: 'front' | 'back';
    w: number;
    h: number;
    card?: Card;
    text?: string;
    title?: string;
    photo?: PhotoSource;
    edition?: string;
    amount?: number;
    purpose?: string;
    pattern?: PatternId;
    icon?: SpaceIconSource;
    bleed: number;
};

const CardFace = ({
    deck,
    side,
    w,
    h,
    card,
    text,
    title,
    photo,
    edition,
    amount: ownAmount,
    purpose,
    pattern,
    icon,
    bleed,
}: FaceProps) => {
    const { locale, words, currency } = useRender();
    const name = title ?? words.decks?.[deck] ?? deckName(deck, locale);
    const body =
        text ??
        (card === undefined
            ? ''
            : standardCardText(
                  card.text[locale],
                  locale,
                  card.amount,
                  currency,
                  words.currencySymbol,
              ));
    // A bare standard card brings its own amount line, unless its text holds the amount itself.
    const amount =
        ownAmount ??
        (text === undefined && card !== undefined
            ? card.text[locale].includes('{amount}')
                ? undefined
                : card.amount
            : undefined);

    return side === 'back' ? (
        <CardBack
            deck={deck}
            w={w}
            h={h}
            name={name}
            edition={edition}
            photo={photo}
            pattern={pattern}
            icon={icon}
            bleed={bleed}
        />
    ) : (
        <CardFront
            deck={deck}
            w={w}
            h={h}
            name={name}
            body={body}
            amount={amount}
            purpose={purpose}
            photo={photo}
            bleed={bleed}
        />
    );
};
