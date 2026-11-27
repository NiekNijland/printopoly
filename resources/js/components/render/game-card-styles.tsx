import { mix, readableOn, withAlpha } from '@/lib/render/color';
import type { CardStyle } from '@/lib/render/edition-part-styles';
import type { PhotoSource } from '@/lib/render/photo';
import { PLAYFAIR, SPARTAN, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import type { DeckId } from '@/types/game';

import { Pill } from './board-look-playful';
import { Cartouche } from './board-look-vintage';
import {
    ConfettiField,
    Flourish,
    Ornament,
    ScallopBadge,
    Svg,
    WobblyTile,
    borderItems,
    creamed,
    discItem,
    engraving,
    fieldItem,
    ovalItems,
    rosetteItem,
} from './card-look';
import { FitText } from './fit-text';
import { Icon } from './icons';
import { PhotoSlot } from './photo-slot';
import { Abs, useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

/**
 * Chance and Community Chest cards in a style of their own (B269), the same family as the board styles (B268):
 *
 * - Vintage: cream-tinted deck colour, a guilloche border between two rules like an old banknote, a rosette with
 *   the deck symbol, Playfair in spaced capitals, and the amount in a cartouche with cut corners.
 * - Modern: a flat block in the deck colour with the name large in it, the text left-aligned and big, and the
 *   amount on a bar of ink across the foot of the card.
 * - Speels (playful): a paper tile with a hand-drawn edge on the deck colour, the name on a tilted sticker next to
 *   a scalloped badge, confetti, and the amount on a pill.
 *
 * The theme's own look stays in game-card.tsx. Every style keeps the slots of the theme look (`title`, `text`,
 * `amount`, `art`, `title-band`, `text-panel`, `back-art`, `edition`), so the fit check and the print find the
 * same parts, and only uses the fonts the print page loads.
 */

/** The paper a card is printed on in a style: it runs into the bleed. */
export const cardPaper = (
    theme: Theme,
    style: CardStyle,
    deck: DeckId,
    side: 'front' | 'back',
): string => {
    switch (style) {
        case 'vintage':
            return creamed(theme.deck[deck], 0.5);
        case 'modern':
            return side === 'back' ? theme.deckAccent[deck] : theme.paper;
        case 'playful':
            return theme.deck[deck];
    }
};

export type StyledFrontProps = {
    style: CardStyle;
    deck: DeckId;
    w: number;
    h: number;
    name: string;
    body: string;
    /** "Betaal € 15 voor je taalcursus", or empty without an amount. */
    amountText: string;
    /** The height of the amount line: two lines with a purpose. */
    lineHeight: number;
    photo?: PhotoSource;
    /** The photo fills the whole card (B124). */
    full: boolean;
    bleed: number;
};

const deckIcon = (deck: DeckId): 'dice' | 'chest' => {
    return deck === 'chance' ? 'dice' : 'chest';
};

export const StyledCardFront = (props: StyledFrontProps) => {
    switch (props.style) {
        case 'vintage':
            return <VintageFront {...props} />;
        case 'modern':
            return <ModernFront {...props} />;
        case 'playful':
            return <PlayfulFront {...props} />;
    }
};

/** A photo in a box with rounded corners, cut to the box. */
const RoundedPhoto = ({
    x,
    y,
    w,
    h,
    radius,
    photo,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    radius: number;
    photo: PhotoSource;
}) => {
    return (
        <Abs
            x={x}
            y={y}
            w={w}
            h={h}
            style={{ borderRadius: mm(radius), overflow: 'hidden' }}
        >
            <PhotoSlot x={0} y={0} w={w} h={h} photo={photo} />
        </Abs>
    );
};

/** Border inset and band width of Vintage on a card. */
const V_INSET = 2.4;
const V_BAND = 2;

const VintageFront = ({
    deck,
    w,
    h,
    name,
    body,
    amountText,
    lineHeight,
    photo,
    full,
    bleed,
}: StyledFrontProps) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const engr = engraving(theme, accent);
    const paper = creamed(theme.deck[deck], 0.5);
    const plate = mix(paper, '#FFFFFF', 0.55);
    const framed = photo !== undefined && !full;
    const hasAmount = amountText !== '';
    const boxH = lineHeight + 2.6;
    const boxY = h - V_INSET - V_BAND - 1.6 - boxH;
    const titleY = full ? 5.4 : framed ? 6.2 : 17.6;
    const bodyTop = full ? 52.5 : framed ? 44 : 28.5;
    const bodyBottom = hasAmount ? boxY - 1.4 : h - V_INSET - V_BAND - 2.2;

    return (
        <>
            {full && photo !== undefined && (
                <>
                    <PhotoSlot
                        x={-bleed}
                        y={-bleed}
                        w={w + 2 * bleed}
                        h={h + 2 * bleed}
                        photo={photo}
                    />
                    <Abs
                        x={6}
                        y={4}
                        w={w - 12}
                        h={11}
                        style={{ background: withAlpha(paper, 0.9) }}
                        slot="title-band"
                    />
                    <Abs
                        x={4.6}
                        y={49.5}
                        w={w - 9.2}
                        h={h - 49.5 - 4.6}
                        style={{ background: withAlpha(paper, 0.93) }}
                        slot="text-panel"
                    />
                    <Cartouche
                        x={4.6}
                        y={49.5}
                        w={w - 9.2}
                        h={h - 49.5 - 4.6}
                        color={engr}
                        fill="none"
                    />
                </>
            )}
            {!full && (
                // The paper, border, watermark and medallion as one picture per kind of card in print (B269).
                <Ornament
                    x={0}
                    y={0}
                    w={w}
                    h={h}
                    background={paper}
                    slot="engraved-border"
                    items={[
                        ...borderItems({
                            w,
                            h,
                            inset: V_INSET,
                            band: V_BAND,
                            color: engr,
                            paper,
                        }),
                        ...(framed
                            ? []
                            : [
                                  rosetteItem({
                                      cx: w / 2,
                                      // One place for every card, so the cards with and without an amount share one picture.
                                      cy: 47,
                                      r: 19,
                                      count: 20,
                                      color: engr,
                                      alpha: 0.16,
                                  }),
                                  rosetteItem({
                                      cx: w / 2,
                                      cy: 11.3,
                                      r: 5.4,
                                      color: engr,
                                      alpha: 0.55,
                                  }),
                                  discItem({
                                      cx: w / 2,
                                      cy: 11.3,
                                      r: 3.5,
                                      color: engr,
                                      fill: plate,
                                  }),
                              ]),
                    ]}
                />
            )}
            {!full && !framed && (
                <>
                    <Icon
                        name={deckIcon(deck)}
                        x={w / 2 - 2.4}
                        y={11.3 - 2.4}
                        size={4.8}
                        color={accent}
                        strokeWidth={1.7}
                    />
                </>
            )}
            <FitText
                text={name}
                x={8}
                y={titleY}
                w={w - 16}
                h={6.6}
                maxFontMm={5.2}
                minFontMm={2.4}
                family={PLAYFAIR}
                weight={700}
                caps
                letterSpacingEm={0.12}
                align="center"
                color={theme.ink}
                slot="title"
            />
            <Flourish x={w / 2 - 14} y={titleY + 7.8} w={28} color={engr} />
            {framed && (
                <>
                    <Abs
                        x={7}
                        y={16.5}
                        w={w - 14}
                        h={25}
                        style={{ background: mix(paper, accent, 0.25) }}
                        slot="art"
                    />
                    <PhotoSlot x={7} y={16.5} w={w - 14} h={25} photo={photo} />
                    <Svg x={7} y={16.5} w={w - 14} h={25}>
                        <rect
                            x={-0.9}
                            y={-0.9}
                            width={w - 14 + 1.8}
                            height={25 + 1.8}
                            fill="none"
                            stroke={engr}
                            strokeWidth={0.3}
                        />
                        <rect
                            x={0}
                            y={0}
                            width={w - 14}
                            height={25}
                            fill="none"
                            stroke={engr}
                            strokeWidth={0.12}
                        />
                    </Svg>
                </>
            )}
            <FitText
                text={body}
                x={7.5}
                y={bodyTop}
                w={w - 15}
                h={bodyBottom - bodyTop}
                maxFontMm={framed || full ? 3.8 : 4.4}
                minFontMm={2.2}
                wrap="words"
                family={PLAYFAIR}
                weight={700}
                align="center"
                valign="middle"
                lineHeight={1.32}
                color={theme.ink}
                slot="text"
            />
            {hasAmount && (
                <>
                    <Cartouche
                        x={8}
                        y={boxY}
                        w={w - 16}
                        h={boxH}
                        color={engr}
                        fill={plate}
                    />
                    <FitText
                        text={amountText}
                        x={10.5}
                        y={boxY + 1.3}
                        w={w - 21}
                        h={lineHeight}
                        maxFontMm={4.6}
                        minFontMm={2.6}
                        wrap="words"
                        family={PLAYFAIR}
                        weight={700}
                        align="center"
                        color={theme.ink}
                        slot="amount"
                    />
                </>
            )}
        </>
    );
};

/** The block of Modern: the deck colour from the top edge into the bleed. */
const ModernBlock = ({
    deck,
    w,
    height,
    bleed,
    slot,
}: {
    deck: DeckId;
    w: number;
    height: number;
    bleed: number;
    slot: string;
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const on = readableOn(accent);

    return (
        <Abs
            x={-bleed}
            y={-bleed}
            w={w + 2 * bleed}
            h={height + bleed}
            style={{ background: accent, overflow: 'hidden' }}
            slot={slot}
        >
            {/* The deck symbol large and cut off by the block, a print mark more than a picture. */}
            <div style={{ opacity: 0.22 }}>
                <Icon
                    name={deckIcon(deck)}
                    x={w + bleed - 25}
                    y={bleed + height - 27}
                    size={34}
                    color={on}
                    strokeWidth={1.5}
                />
            </div>
        </Abs>
    );
};

const ModernFront = ({
    deck,
    w,
    h,
    name,
    body,
    amountText,
    lineHeight,
    photo,
    full,
    bleed,
}: StyledFrontProps) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const on = readableOn(accent);
    const framed = photo !== undefined && !full;
    const hasAmount = amountText !== '';
    const blockH = framed || full ? 21 : 32;
    const barH = lineHeight + 4.4;
    const bodyTop = full ? 54 : framed ? blockH + 27.5 : blockH + 5.5;
    const bodyBottom = hasAmount ? h - barH - 2.5 : h - 5;

    return (
        <>
            {full && photo !== undefined && (
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
                        y={50}
                        w={w + 2 * bleed}
                        h={h - 50 + bleed}
                        style={{ background: withAlpha(theme.paper, 0.94) }}
                        slot="text-panel"
                    />
                </>
            )}
            <ModernBlock
                deck={deck}
                w={w}
                height={blockH}
                bleed={bleed}
                slot={full ? 'title-band' : 'block'}
            />
            <Abs x={5} y={6.5} w={9} h={1.2} style={{ background: on }} />
            <FitText
                text={name}
                x={5}
                y={9}
                w={w - 10}
                h={blockH - 11.5}
                maxFontMm={framed || full ? 6.5 : 9}
                minFontMm={2.6}
                wrap="words"
                family={SPARTAN}
                weight={800}
                caps
                letterSpacingEm={-0.01}
                lineHeight={0.95}
                align="left"
                valign="bottom"
                color={on}
                slot="title"
            />
            {framed && (
                <>
                    <Abs
                        x={-bleed}
                        y={blockH}
                        w={w + 2 * bleed}
                        h={24}
                        style={{ background: mix(theme.paper, accent, 0.3) }}
                        slot="art"
                    />
                    <PhotoSlot
                        x={-bleed}
                        y={blockH}
                        w={w + 2 * bleed}
                        h={24}
                        photo={photo}
                    />
                </>
            )}
            <FitText
                text={body}
                x={5}
                y={bodyTop}
                w={w - 10}
                h={bodyBottom - bodyTop}
                maxFontMm={framed || full ? 4.2 : 5.2}
                minFontMm={2.2}
                wrap="words"
                font="body"
                weight={600}
                align="left"
                valign="top"
                lineHeight={1.22}
                color={theme.ink}
                slot="text"
            />
            {hasAmount && (
                <>
                    <Abs
                        x={-bleed}
                        y={h - barH}
                        w={w + 2 * bleed}
                        h={barH + bleed}
                        style={{ background: theme.ink }}
                        slot="amount-bar"
                    />
                    <Abs
                        x={5}
                        y={h - barH + 2.2}
                        w={1.2}
                        h={lineHeight}
                        style={{ background: accent }}
                    />
                    <FitText
                        text={amountText}
                        x={8}
                        y={h - barH + 2.2}
                        w={w - 13}
                        h={lineHeight}
                        maxFontMm={4.8}
                        minFontMm={2.6}
                        wrap="words"
                        family={SPARTAN}
                        weight={800}
                        align="left"
                        lineHeight={1.05}
                        color={readableOn(theme.ink)}
                        slot="amount"
                    />
                </>
            )}
        </>
    );
};

/** Where the sticker with the name sits on a Speels card. */
const P_TITLE = { y: 6.6, h: 9.6 };

/** The name of a Speels card on a tilted sticker, with the deck symbol on a scalloped badge at its start. */
const PlayfulTitle = ({
    deck,
    w,
    name,
    icon,
    slot,
}: {
    deck: DeckId;
    w: number;
    name: string;
    icon?: SpaceIconSource;
    slot?: string;
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const pillX = 13.5;
    const pillW = w - pillX - 6.5;

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: mm(pillX),
                    top: mm(P_TITLE.y),
                    width: mm(pillW),
                    height: mm(P_TITLE.h),
                    transform: 'rotate(-2.5deg)',
                }}
                data-slot={slot}
            >
                <Pill
                    x={0}
                    y={0}
                    w={pillW}
                    h={P_TITLE.h}
                    fill={accent}
                    ink={theme.ink}
                />
                <FitText
                    text={name}
                    x={5}
                    y={0.6}
                    w={pillW - 8}
                    h={P_TITLE.h - 1.2}
                    maxFontMm={5.4}
                    minFontMm={2.4}
                    family={SPARTAN}
                    weight={800}
                    align="center"
                    color={readableOn(accent)}
                    slot="title"
                />
            </div>
            <ScallopBadge
                cx={11.6}
                cy={P_TITLE.y + P_TITLE.h / 2}
                r={5.6}
                fill={theme.deck[deck]}
                ink={theme.ink}
                bumps={14}
            />
            <SpaceIconArt
                icon={icon}
                fallback={deckIcon(deck)}
                x={11.6 - 2.9}
                y={P_TITLE.y + P_TITLE.h / 2 - 2.9}
                size={5.8}
                color={accent}
                strokeWidth={1.7}
            />
        </>
    );
};

/** The colours of confetti: the accents of the theme and its ink. */
const confettiColors = (theme: Theme, deck: DeckId): string[] => {
    return [theme.deckAccent[deck], theme.secondaryAccent, theme.ink];
};

const PlayfulFront = ({
    deck,
    w,
    h,
    name,
    body,
    amountText,
    lineHeight,
    photo,
    full,
    bleed,
}: StyledFrontProps) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const framed = photo !== undefined && !full;
    const hasAmount = amountText !== '';
    const pillH = lineHeight + 3;
    const pillY = h - 6.4 - pillH;
    const bodyTop = full ? 53 : framed ? 46.5 : 20;
    const bodyBottom = hasAmount ? pillY - 1.6 : h - 7;
    const seed = deck === 'chance' ? 11 : 23;

    return (
        <>
            {full && photo !== undefined ? (
                <>
                    <PhotoSlot
                        x={-bleed}
                        y={-bleed}
                        w={w + 2 * bleed}
                        h={h + 2 * bleed}
                        photo={photo}
                    />
                    <Abs
                        x={4}
                        y={50}
                        w={w - 8}
                        h={h - 54}
                        style={{ borderRadius: mm(4) }}
                        slot="text-panel"
                    />
                    <WobblyTile
                        x={4}
                        y={50}
                        w={w - 8}
                        h={h - 54}
                        radius={4}
                        seed={seed + 3}
                        fill={withAlpha(theme.paper, 0.94)}
                        ink={theme.ink}
                    />
                </>
            ) : (
                <>
                    <WobblyTile
                        x={2.8}
                        y={2.8}
                        w={w - 5.6}
                        h={h - 5.6}
                        radius={4.5}
                        seed={seed}
                        fill={theme.paper}
                        ink={theme.ink}
                    />
                    <Abs x={4.2} y={4.2} w={w - 8.4} h={14.5}>
                        <ConfettiField
                            w={w - 8.4}
                            h={14.5}
                            colors={confettiColors(theme, deck)}
                            seed={seed}
                            count={9}
                            size={0.7}
                            keep={{ x: 1.8, y: 1.4, w: w - 12.5, h: 12 }}
                        />
                    </Abs>
                </>
            )}
            <PlayfulTitle
                deck={deck}
                w={w}
                name={name}
                slot={full ? 'title-band' : undefined}
            />
            {framed && (
                <>
                    <Abs
                        x={6.5}
                        y={20}
                        w={w - 13}
                        h={24}
                        style={{
                            background: mix(theme.deck[deck], accent, 0.3),
                            borderRadius: mm(3.5),
                        }}
                        slot="art"
                    />
                    <RoundedPhoto
                        x={6.5}
                        y={20}
                        w={w - 13}
                        h={24}
                        radius={3.5}
                        photo={photo}
                    />
                    <WobblyTile
                        x={6.5}
                        y={20}
                        w={w - 13}
                        h={24}
                        radius={3.5}
                        seed={seed + 5}
                        fill="none"
                        ink={theme.ink}
                        slot="photo-edge"
                    />
                </>
            )}
            <FitText
                text={body}
                x={7}
                y={bodyTop}
                w={w - 14}
                h={bodyBottom - bodyTop}
                maxFontMm={framed || full ? 4 : 4.8}
                minFontMm={2.2}
                wrap="words"
                font="body"
                weight={600}
                align="center"
                valign="middle"
                lineHeight={1.28}
                color={theme.ink}
                slot="text"
            />
            {hasAmount && (
                <>
                    <Pill
                        x={8}
                        y={pillY}
                        w={w - 16}
                        h={pillH}
                        fill={mix(accent, theme.paper, 0.78)}
                        ink={theme.ink}
                    />
                    <FitText
                        text={amountText}
                        x={12}
                        y={pillY + 1.5}
                        w={w - 24}
                        h={lineHeight}
                        maxFontMm={4.6}
                        minFontMm={2.6}
                        wrap="words"
                        family={SPARTAN}
                        weight={800}
                        align="center"
                        lineHeight={1.05}
                        color={theme.ink}
                        slot="amount"
                    />
                </>
            )}
        </>
    );
};

export type StyledBackProps = {
    style: CardStyle;
    deck: DeckId;
    w: number;
    h: number;
    name: string;
    edition?: string;
    icon?: SpaceIconSource;
};

/** The standard back of a card in a style: no photo or pattern of its own. */
export const StyledCardBack = (props: StyledBackProps) => {
    switch (props.style) {
        case 'vintage':
            return <VintageBack {...props} />;
        case 'modern':
            return <ModernBack {...props} />;
        case 'playful':
            return <PlayfulBack {...props} />;
    }
};

const hasText = (text: string | undefined): text is string => {
    return text !== undefined && text.trim() !== '';
};

const VintageBack = ({ deck, w, h, name, edition, icon }: StyledBackProps) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const engr = engraving(theme, accent);
    const paper = creamed(theme.deck[deck], 0.5);
    const plate = mix(paper, '#FFFFFF', 0.55);
    const inner = V_INSET + V_BAND;
    const cy = h / 2;

    return (
        <>
            {/* The ground, border, oval and rosette as one picture per deck in print (B269). */}
            <Ornament
                x={0}
                y={0}
                w={w}
                h={h}
                background={paper}
                slot="engraved-border"
                items={[
                    fieldItem({
                        x: inner,
                        y: inner,
                        w: w - 2 * inner,
                        h: h - 2 * inner,
                        color: engr,
                        alpha: 0.2,
                    }),
                    ...borderItems({
                        w,
                        h,
                        inset: V_INSET,
                        band: V_BAND,
                        color: engr,
                        paper,
                    }),
                    ...ovalItems({
                        x: w / 2 - 22.5,
                        y: cy - 31,
                        w: 45,
                        h: 62,
                        color: engr,
                        fill: plate,
                    }),
                    rosetteItem({
                        cx: w / 2,
                        cy: cy - 13,
                        r: 10.5,
                        color: engr,
                        alpha: 0.5,
                        count: 24,
                    }),
                    discItem({
                        cx: w / 2,
                        cy: cy - 13,
                        r: 6,
                        color: engr,
                        fill: plate,
                    }),
                ]}
            />
            <SpaceIconArt
                icon={icon}
                fallback={deckIcon(deck)}
                x={w / 2 - 4.5}
                y={cy - 17.5}
                size={9}
                color={accent}
                strokeWidth={1.5}
            />
            <Cartouche
                x={5.5}
                y={cy + 0.5}
                w={w - 11}
                h={12}
                color={engr}
                fill={plate}
            />
            <FitText
                text={name}
                x={8.5}
                y={cy + 2}
                w={w - 17}
                h={9}
                maxFontMm={6.4}
                minFontMm={2.6}
                wrap="words"
                family={PLAYFAIR}
                weight={700}
                caps
                letterSpacingEm={0.1}
                lineHeight={1.05}
                align="center"
                color={theme.ink}
                slot="title"
            />
            <Flourish x={w / 2 - 10} y={cy + 15.6} w={20} color={engr} />
            {hasText(edition) && (
                <FitText
                    text={edition}
                    // Inside the oval, clear of its rule: a long name wraps onto a second line (Niek, 22 nov).
                    x={w / 2 - 12}
                    y={cy + 17.2}
                    w={24}
                    h={6.6}
                    maxFontMm={2.5}
                    minFontMm={1.5}
                    wrap="words"
                    family={PLAYFAIR}
                    weight={700}
                    caps
                    letterSpacingEm={0.12}
                    lineHeight={1.15}
                    align="center"
                    valign="top"
                    color={engr}
                    slot="edition"
                />
            )}
        </>
    );
};

const ModernBack = ({ deck, w, h, name, edition, icon }: StyledBackProps) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const on = readableOn(accent);
    const cy = 31;

    return (
        <>
            <Svg x={0} y={0} w={w} h={h} slot="disc">
                <circle
                    cx={w / 2}
                    cy={cy}
                    r={23}
                    fill="none"
                    stroke={on}
                    strokeWidth={0.5}
                    opacity={0.35}
                />
                <circle cx={w / 2} cy={cy} r={17} fill={theme.paper} />
            </Svg>
            <SpaceIconArt
                icon={icon}
                fallback={deckIcon(deck)}
                x={w / 2 - 10}
                y={cy - 10}
                size={20}
                color={accent}
                strokeWidth={1.6}
            />
            <FitText
                text={name}
                x={5}
                y={56}
                w={w - 10}
                h={15}
                maxFontMm={11}
                minFontMm={3}
                wrap="words"
                family={SPARTAN}
                weight={800}
                caps
                letterSpacingEm={-0.01}
                lineHeight={0.95}
                align="center"
                valign="middle"
                color={on}
                slot="title"
            />
            <Abs
                x={w / 2 - 5}
                y={72.5}
                w={10}
                h={1.2}
                style={{ background: on }}
            />
            {hasText(edition) && (
                <FitText
                    text={edition}
                    x={8}
                    y={75}
                    w={w - 16}
                    h={4.5}
                    maxFontMm={2.8}
                    minFontMm={1.6}
                    font="body"
                    weight={600}
                    caps
                    letterSpacingEm={0.14}
                    align="center"
                    color={on}
                    slot="edition"
                />
            )}
        </>
    );
};

const PlayfulBack = ({ deck, w, h, name, edition, icon }: StyledBackProps) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const cy = h / 2 - 4;
    const r = 19.5;
    const seed = deck === 'chance' ? 31 : 47;

    return (
        <>
            <ConfettiField
                w={w}
                h={h}
                colors={confettiColors(theme, deck)}
                seed={seed}
                count={30}
                size={1}
                keep={{
                    x: w / 2 - r - 1,
                    y: cy - r - 1,
                    w: 2 * r + 2,
                    h: 2 * r + 12,
                }}
            />
            <ScallopBadge
                cx={w / 2}
                cy={cy}
                r={r}
                fill={theme.paper}
                ink={theme.ink}
                bumps={20}
            />
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transform: 'rotate(-8deg)',
                    transformOrigin: `${mm(w / 2)} ${mm(cy - 8)}`,
                }}
            >
                <SpaceIconArt
                    icon={icon}
                    fallback={deckIcon(deck)}
                    x={w / 2 - 6}
                    y={cy - 14}
                    size={12}
                    color={accent}
                    strokeWidth={1.6}
                />
            </div>
            <FitText
                text={name}
                x={w / 2 - 14.5}
                y={cy + 0.5}
                w={29}
                h={10}
                maxFontMm={6.5}
                minFontMm={2.4}
                wrap="words"
                family={SPARTAN}
                weight={800}
                lineHeight={1}
                align="center"
                color={theme.ink}
                slot="title"
            />
            {hasText(edition) && (
                <div
                    style={{
                        position: 'absolute',
                        left: mm(w / 2 - 17),
                        top: mm(cy + r + 2.5),
                        width: mm(34),
                        height: mm(6.5),
                        transform: 'rotate(2deg)',
                    }}
                >
                    <Pill
                        x={0}
                        y={0}
                        w={34}
                        h={6.5}
                        fill={mix(accent, theme.paper, 0.78)}
                        ink={theme.ink}
                    />
                    <FitText
                        text={edition}
                        x={3}
                        y={0.8}
                        w={28}
                        h={4.9}
                        maxFontMm={3}
                        minFontMm={1.6}
                        font="body"
                        weight={600}
                        align="center"
                        color={theme.ink}
                        slot="edition"
                    />
                </div>
            )}
        </>
    );
};

/**
 * The plate in the middle of a back made of a photo or a pattern (B56, B130), in a style: a cartouche in Vintage,
 * a block across the card in Modern, a scalloped badge in Speels. It names the deck so the two backs stay apart.
 */
export const StyledArtPlate = ({
    style,
    deck,
    w,
    h,
    name,
    edition,
    bleed,
}: {
    style: CardStyle;
    deck: DeckId;
    w: number;
    h: number;
    name: string;
    edition?: string;
    bleed: number;
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const cy = h / 2;

    switch (style) {
        case 'vintage': {
            const engr = engraving(theme, accent);
            const plate = mix(creamed(theme.deck[deck], 0.5), '#FFFFFF', 0.4);

            return (
                <>
                    <Cartouche
                        x={7}
                        y={cy - 16}
                        w={w - 14}
                        h={32}
                        color={engr}
                        fill={plate}
                    />
                    <Icon
                        name={deckIcon(deck)}
                        x={w / 2 - 4}
                        y={cy - 13}
                        size={8}
                        color={accent}
                        strokeWidth={1.5}
                    />
                    <FitText
                        text={name}
                        x={10}
                        y={cy - 3.5}
                        w={w - 20}
                        h={8}
                        maxFontMm={6}
                        minFontMm={2.6}
                        wrap="words"
                        family={PLAYFAIR}
                        weight={700}
                        caps
                        letterSpacingEm={0.1}
                        align="center"
                        color={theme.ink}
                        slot="title"
                    />
                    <Flourish x={w / 2 - 10} y={cy + 6} w={20} color={engr} />
                    {hasText(edition) && (
                        <FitText
                            text={edition}
                            x={11}
                            y={cy + 8.2}
                            w={w - 22}
                            h={4.4}
                            maxFontMm={2.5}
                            minFontMm={1.6}
                            family={PLAYFAIR}
                            weight={700}
                            caps
                            letterSpacingEm={0.16}
                            align="center"
                            color={engr}
                            slot="edition"
                        />
                    )}
                </>
            );
        }
        case 'modern': {
            const on = readableOn(accent);

            return (
                <>
                    <Abs
                        x={-bleed}
                        y={cy - 13}
                        w={w + 2 * bleed}
                        h={26}
                        style={{ background: accent }}
                        slot="plate"
                    />
                    <Svg x={5} y={cy - 8} w={16} h={16}>
                        <circle cx={8} cy={8} r={8} fill={theme.paper} />
                    </Svg>
                    <Icon
                        name={deckIcon(deck)}
                        x={8}
                        y={cy - 5}
                        size={10}
                        color={accent}
                        strokeWidth={1.6}
                    />
                    <FitText
                        text={name}
                        x={24}
                        y={cy - 9}
                        w={w - 29}
                        h={hasText(edition) ? 12 : 18}
                        maxFontMm={7.5}
                        minFontMm={2.6}
                        wrap="words"
                        family={SPARTAN}
                        weight={800}
                        caps
                        lineHeight={0.95}
                        align="left"
                        valign={hasText(edition) ? 'bottom' : 'middle'}
                        color={on}
                        slot="title"
                    />
                    {hasText(edition) && (
                        <FitText
                            text={edition}
                            x={24}
                            y={cy + 4}
                            w={w - 29}
                            h={4.4}
                            maxFontMm={2.8}
                            minFontMm={1.6}
                            font="body"
                            weight={600}
                            caps
                            letterSpacingEm={0.12}
                            align="left"
                            color={on}
                            slot="edition"
                        />
                    )}
                </>
            );
        }
        case 'playful':
            return (
                <>
                    <ScallopBadge
                        cx={w / 2}
                        cy={cy}
                        r={18}
                        fill={theme.paper}
                        ink={theme.ink}
                        bumps={20}
                    />
                    <Icon
                        name={deckIcon(deck)}
                        x={w / 2 - 5}
                        y={cy - 13.5}
                        size={10}
                        color={accent}
                        strokeWidth={1.6}
                    />
                    <FitText
                        text={name}
                        x={w / 2 - 13.5}
                        y={cy - 3}
                        w={27}
                        h={9}
                        maxFontMm={6}
                        minFontMm={2.4}
                        wrap="words"
                        family={SPARTAN}
                        weight={800}
                        lineHeight={1}
                        align="center"
                        color={theme.ink}
                        slot="title"
                    />
                    {hasText(edition) && (
                        <FitText
                            text={edition}
                            x={w / 2 - 12}
                            y={cy + 6.5}
                            w={24}
                            h={4}
                            maxFontMm={2.6}
                            minFontMm={1.5}
                            font="body"
                            weight={600}
                            align="center"
                            color={theme.ink}
                            slot="edition"
                        />
                    )}
                </>
            );
    }
};
