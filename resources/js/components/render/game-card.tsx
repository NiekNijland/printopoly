import {
    cardTextContext,
    mapCardTextSegments,
    renderCardText,
} from '@/lib/edition/card-text';
import { standardEdition, withCurrency } from '@/lib/game/standard-edition';
import type { Card, CurrencyId, DeckId, Locale } from '@/lib/game/types';
import { mix, withAlpha } from '@/lib/render/color';
import type { PatternId } from '@/lib/render/patterns';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { THEMES } from '@/lib/render/themes';

import { FitText } from './fit-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import { Icon } from './icons';
import { PatternFill } from './pattern-fill';
import { BAND_OPACITY, PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

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
}

/**
 * A standard card text drawn without an edition (a thumbnail, a landing page): the standard words and the
 * standard names of the spaces fill in the placeholders and variables (B126, B131).
 */
function standardCardText(
    raw: string,
    locale: Locale,
    amount: number | undefined,
    currencyId: CurrencyId,
    symbol: string | undefined,
): string {
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
    photo,
    edition,
    amount,
    purpose,
    layers,
    pattern,
    icon,
    ...element
}: GameCardProps) {
    const { w, h } = { w: CARD_SIZE_MM.width, h: CARD_SIZE_MM.height };

    return (
        <Sheet
            {...element}
            element={`card-${deck}-${side}`}
            widthMm={w}
            heightMm={h}
            background={THEMES[element.theme].deck[deck]}
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
}

interface FaceProps {
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
    photo,
    edition,
    amount: ownAmount,
    purpose,
    pattern,
    icon,
    bleed,
}: FaceProps) {
    const { theme, locale, money, words, currency } = useRender();
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
    const accent = theme.deckAccent[deck];
    const iconName = deck === 'chance' ? 'dice' : 'chest';
    const hasMedia = photo !== undefined;
    const layout = hasMedia ? 'framed' : 'text';

    if (side === 'back' && (photo !== undefined || pattern !== undefined)) {
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

    if (side === 'back') {
        // Without a photo the back is a centred stack: symbol, deck name, edition name.
        // With a photo the name moves up and the photo takes the space below it.
        const stacked = !hasMedia;
        const nameTop = stacked ? h / 2 - 9 : 9;
        const nameHeight = stacked ? 16 : 14;

        return (
            <>
                <Frame
                    x={3}
                    y={3}
                    w={w - 6}
                    h={h - 6}
                    color={theme.ink}
                    strokeMm={theme.frameMm}
                    radiusMm={Math.max(0, theme.cardRadiusMm - 2)}
                />
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
    }

    // "Full": the photo is the whole card, the title sits on a light band and the text on a light panel (B124).
    const full = hasMedia && isFullPhoto(photo);
    const panelTop = 50;
    const artTop = 16;
    const artHeight = 28;
    const bodyTop = full
        ? panelTop + 3
        : layout === 'framed'
          ? artTop + artHeight + 3.5
          : 21;
    const hasAmount = amount !== undefined && amount !== 0;
    const trimmedPurpose = purpose?.trim();
    const hasPurpose =
        hasAmount && trimmedPurpose !== undefined && trimmedPurpose !== '';
    // With a purpose the line may wrap onto a second line.
    const lineHeight = hasPurpose ? 12 : 8;
    const amountHeight = hasAmount ? lineHeight + 2 : 0;
    const bodyHeight =
        (layout === 'framed' ? h - bodyTop - M : 49) - amountHeight;
    const panel = withAlpha(theme.paper, 0.92);
    const amountText = hasAmount
        ? (amount > 0 ? STRINGS[locale].receive : STRINGS[locale].pay)(
              money(Math.abs(amount)),
              hasPurpose ? trimmedPurpose : undefined,
          )
        : '';

    return (
        <>
            {full && (
                <>
                    <PhotoSlot
                        x={-bleed}
                        y={-bleed}
                        w={w + 2 * bleed}
                        h={h + 2 * bleed}
                        photo={photo}
                    />
                    <Abs
                        x={-bleed}
                        y={3.5}
                        w={w + 2 * bleed}
                        h={12}
                        style={{
                            background: withAlpha(theme.paper, BAND_OPACITY),
                        }}
                        slot="title-band"
                    />
                    <Abs
                        x={3}
                        y={panelTop}
                        w={w - 6}
                        h={h - panelTop - 3}
                        style={{
                            background: panel,
                            borderRadius: '1.5mm',
                            boxSizing: 'border-box',
                            border: `0.3mm solid ${theme.ink}`,
                        }}
                        slot="text-panel"
                    />
                </>
            )}
            {layout === 'text' && (
                <Icon
                    name={iconName}
                    x={w / 2 - 3.5}
                    y={4.5}
                    size={7}
                    color={accent}
                    strokeWidth={1.6}
                />
            )}
            <FitText
                text={name}
                x={M}
                y={layout === 'text' ? 12 : 4.5}
                w={w - 2 * M}
                h={layout === 'text' ? 8 : 10}
                maxFontMm={layout === 'text' ? 6.5 : 8}
                minFontMm={2.5}
                font="heading"
                align="center"
                slot="title"
            />
            {layout === 'framed' && !full && (
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
            <FitText
                text={body}
                x={M}
                y={bodyTop}
                w={w - 2 * M}
                // Without an amount line the text also gets the bottom of the card, centred like the original (B133).
                h={bodyHeight + (layout === 'text' && !hasAmount ? 10 : 0)}
                maxFontMm={layout === 'text' ? 5 : 4}
                minFontMm={2.2}
                wrap="words"
                font="body"
                align="center"
                valign={layout === 'text' ? 'middle' : 'top'}
                lineHeight={1.3}
                slot="text"
            />
            {hasAmount && (
                <>
                    <Abs
                        x={M}
                        y={h - M - lineHeight - 1}
                        w={w - 2 * M}
                        h={0}
                        style={{ borderTop: `0.3mm solid ${theme.ink}` }}
                    />
                    <FitText
                        text={amountText}
                        x={M}
                        y={h - M - lineHeight}
                        w={w - 2 * M}
                        h={lineHeight}
                        maxFontMm={5.5}
                        minFontMm={3}
                        wrap={hasPurpose ? 'words' : 'none'}
                        font="heading"
                        align="center"
                        slot="amount"
                    />
                </>
            )}
        </>
    );
}

interface ArtBackProps {
    deck: DeckId;
    name: string;
    edition?: string;
    photo?: PhotoSource;
    pattern?: PatternId;
    w: number;
    h: number;
    bleed: number;
}

/**
 * A back made of a photo or a pattern, over the whole card including the bleed (B56, B130), with a
 * small plate in the middle that names the deck so the two backs stay apart.
 */
function ArtBack({
    deck,
    name,
    edition,
    photo,
    pattern,
    w,
    h,
    bleed,
}: ArtBackProps) {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const iconName = deck === 'chance' ? 'dice' : 'chest';
    const plateW = w - 16;
    const plateH = 30;
    const plateX = 8;
    const plateY = h / 2 - plateH / 2;

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
            <Frame
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
}
