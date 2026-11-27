import { mix, withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { partStyleOf } from '@/lib/render/style';
import type { DeckId } from '@/types/game';

import { FitText } from './fit-text';
import { StyledCardFront } from './game-card-styles';
import { Icon } from './icons';
import { BAND_OPACITY, PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, useRender } from './sheet';

/** Margin between the trim edge and the content, in mm. */
const M = 4.5;

const ThemeFullPhoto = ({
    w,
    h,
    bleed,
    photo,
    panelTop,
}: {
    w: number;
    h: number;
    bleed: number;
    photo: PhotoSource | undefined;
    panelTop: number;
}) => {
    const { theme } = useRender();
    const panel = withAlpha(theme.paper, 0.92);

    return (
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
    );
};

const ThemeFramedArt = ({
    deck,
    w,
    photo,
    artTop,
    artHeight,
}: {
    deck: DeckId;
    w: number;
    photo: PhotoSource | undefined;
    artTop: number;
    artHeight: number;
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const iconName = deck === 'chance' ? 'dice' : 'chest';
    const hasMedia = photo !== undefined;

    return (
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
    );
};

const ThemeAmount = ({
    w,
    h,
    lineHeight,
    amountText,
    hasPurpose,
}: {
    w: number;
    h: number;
    lineHeight: number;
    amountText: string;
    hasPurpose: boolean;
}) => {
    const { theme } = useRender();

    return (
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
    );
};

const ThemeTitle = ({
    deck,
    w,
    name,
    layout,
}: {
    deck: DeckId;
    w: number;
    name: string;
    layout: 'framed' | 'text';
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];
    const iconName = deck === 'chance' ? 'dice' : 'chest';

    return (
        <>
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
        </>
    );
};

type ThemeFrontProps = {
    deck: DeckId;
    w: number;
    h: number;
    name: string;
    body: string;
    photo?: PhotoSource;
    full: boolean;
    hasAmount: boolean;
    hasPurpose: boolean;
    lineHeight: number;
    amountText: string;
    bleed: number;
};

const ThemeCardFront = ({
    deck,
    w,
    h,
    name,
    body,
    photo,
    full,
    hasAmount,
    hasPurpose,
    lineHeight,
    amountText,
    bleed,
}: ThemeFrontProps) => {
    const layout = photo !== undefined ? 'framed' : 'text';
    const panelTop = 50;
    const artTop = 16;
    const artHeight = 28;
    const bodyTop = full
        ? panelTop + 3
        : layout === 'framed'
          ? artTop + artHeight + 3.5
          : 21;
    const amountHeight = hasAmount ? lineHeight + 2 : 0;
    const bodyHeight =
        (layout === 'framed' ? h - bodyTop - M : 49) - amountHeight;

    return (
        <>
            {full && (
                <ThemeFullPhoto
                    w={w}
                    h={h}
                    bleed={bleed}
                    photo={photo}
                    panelTop={panelTop}
                />
            )}
            <ThemeTitle deck={deck} w={w} name={name} layout={layout} />
            {layout === 'framed' && !full && (
                <ThemeFramedArt
                    deck={deck}
                    w={w}
                    photo={photo}
                    artTop={artTop}
                    artHeight={artHeight}
                />
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
                <ThemeAmount
                    w={w}
                    h={h}
                    lineHeight={lineHeight}
                    amountText={amountText}
                    hasPurpose={hasPurpose}
                />
            )}
        </>
    );
};

export const CardFront = ({
    deck,
    w,
    h,
    name,
    body,
    amount,
    purpose,
    photo,
    bleed,
}: {
    deck: DeckId;
    w: number;
    h: number;
    name: string;
    body: string;
    amount: number | undefined;
    purpose?: string;
    photo?: PhotoSource;
    bleed: number;
}) => {
    const { locale, money, style } = useRender();
    const cardStyle = partStyleOf(style, 'cards');
    const hasMedia = photo !== undefined;
    // "Full": the photo is the whole card, the title sits on a light band and the text on a light panel (B124).
    const full = hasMedia && isFullPhoto(photo);
    const hasAmount = amount !== undefined && amount !== 0;
    const trimmedPurpose = purpose?.trim();
    const hasPurpose =
        hasAmount && trimmedPurpose !== undefined && trimmedPurpose !== '';
    // With a purpose the line may wrap onto a second line.
    const lineHeight = hasPurpose ? 12 : 8;
    const amountText = hasAmount
        ? (amount > 0 ? STRINGS[locale].receive : STRINGS[locale].pay)(
              money(Math.abs(amount)),
              hasPurpose ? trimmedPurpose : undefined,
          )
        : '';

    const face = {
        deck,
        w,
        h,
        name,
        body,
        photo,
        full,
        lineHeight,
        amountText,
        bleed,
    };

    if (cardStyle !== undefined) {
        return <StyledCardFront style={cardStyle} {...face} />;
    }

    return (
        <ThemeCardFront
            {...face}
            hasAmount={hasAmount}
            hasPurpose={hasPurpose}
        />
    );
};
