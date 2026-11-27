import { mix, readableOn, withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { SPARTAN } from '@/lib/render/themes';
import type { DeckId } from '@/types/game';

import { FitText } from './fit-text';
import { deckIcon, type StyledFrontProps } from './game-card-styles-shared';
import { Icon } from './icons';
import { PhotoSlot } from './photo-slot';
import { Abs, useRender } from './sheet';

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

const ModernFullPhoto = ({
    w,
    h,
    bleed,
    photo,
}: {
    w: number;
    h: number;
    bleed: number;
    photo: PhotoSource;
}) => {
    const { theme } = useRender();

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
                y={50}
                w={w + 2 * bleed}
                h={h - 50 + bleed}
                style={{ background: withAlpha(theme.paper, 0.94) }}
                slot="text-panel"
            />
        </>
    );
};

const ModernAmountBar = ({
    deck,
    w,
    h,
    bleed,
    barH,
    amountText,
    lineHeight,
}: {
    deck: DeckId;
    w: number;
    h: number;
    bleed: number;
    barH: number;
    amountText: string;
    lineHeight: number;
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];

    return (
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
    );
};

const ModernTitle = ({
    deck,
    w,
    name,
    blockH,
    compact,
}: {
    deck: DeckId;
    w: number;
    name: string;
    blockH: number;
    compact: boolean;
}) => {
    const { theme } = useRender();
    const on = readableOn(theme.deckAccent[deck]);

    return (
        <>
            <Abs x={5} y={6.5} w={9} h={1.2} style={{ background: on }} />
            <FitText
                text={name}
                x={5}
                y={9}
                w={w - 10}
                h={blockH - 11.5}
                maxFontMm={compact ? 6.5 : 9}
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
        </>
    );
};

const ModernFramedPhoto = ({
    deck,
    w,
    bleed,
    blockH,
    photo,
}: {
    deck: DeckId;
    w: number;
    bleed: number;
    blockH: number;
    photo: PhotoSource | undefined;
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];

    return (
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
    );
};

export const ModernFront = ({
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
    const framed = photo !== undefined && !full;
    const hasAmount = amountText !== '';
    const blockH = framed || full ? 21 : 32;
    const barH = lineHeight + 4.4;
    const bodyTop = full ? 54 : framed ? blockH + 27.5 : blockH + 5.5;
    const bodyBottom = hasAmount ? h - barH - 2.5 : h - 5;

    return (
        <>
            {full && photo !== undefined && (
                <ModernFullPhoto w={w} h={h} bleed={bleed} photo={photo} />
            )}
            <ModernBlock
                deck={deck}
                w={w}
                height={blockH}
                bleed={bleed}
                slot={full ? 'title-band' : 'block'}
            />
            <ModernTitle
                deck={deck}
                w={w}
                name={name}
                blockH={blockH}
                compact={framed || full}
            />
            {framed && (
                <ModernFramedPhoto
                    deck={deck}
                    w={w}
                    bleed={bleed}
                    blockH={blockH}
                    photo={photo}
                />
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
                <ModernAmountBar
                    deck={deck}
                    w={w}
                    h={h}
                    bleed={bleed}
                    barH={barH}
                    amountText={amountText}
                    lineHeight={lineHeight}
                />
            )}
        </>
    );
};
