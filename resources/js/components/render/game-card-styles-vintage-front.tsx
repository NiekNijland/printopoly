import { mix, withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { PLAYFAIR } from '@/lib/render/themes';
import type { DeckId } from '@/types/game';

import { Cartouche } from './board-look-vintage';
import {
    Flourish,
    borderItems,
    discItem,
    rosetteItem,
} from './card-look-engraving';
import { Ornament } from './card-look-ornament';
import { FitText } from './fit-text';
import {
    V_BAND,
    V_INSET,
    deckIcon,
    vintageInks,
    type StyledFrontProps,
} from './game-card-styles-shared';
import { Icon } from './icons';
import { PhotoSlot } from './photo-slot';
import { Abs, useRender, Svg } from './sheet';

const VintageFullPhoto = ({
    deck,
    w,
    h,
    bleed,
    photo,
}: {
    deck: DeckId;
    w: number;
    h: number;
    bleed: number;
    photo: PhotoSource;
}) => {
    const { theme } = useRender();
    const { engr, paper } = vintageInks(theme, deck);

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
    );
};

const VintageEngraving = ({
    deck,
    w,
    h,
    framed,
}: {
    deck: DeckId;
    w: number;
    h: number;
    framed: boolean;
}) => {
    const { theme } = useRender();
    const { accent, engr, paper, plate } = vintageInks(theme, deck);

    // The paper, border, watermark and medallion as one picture per kind of card in print (B269).
    return (
        <>
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
            {!framed && (
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
        </>
    );
};

const VintageFramedPhoto = ({
    deck,
    w,
    photo,
}: {
    deck: DeckId;
    w: number;
    photo: PhotoSource | undefined;
}) => {
    const { theme } = useRender();
    const { accent, engr, paper } = vintageInks(theme, deck);

    return (
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
    );
};

const VintageAmount = ({
    deck,
    w,
    boxY,
    boxH,
    amountText,
    lineHeight,
}: {
    deck: DeckId;
    w: number;
    boxY: number;
    boxH: number;
    amountText: string;
    lineHeight: number;
}) => {
    const { theme } = useRender();
    const { engr, plate } = vintageInks(theme, deck);

    return (
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
    );
};

const VintageTitle = ({
    deck,
    w,
    name,
    titleY,
}: {
    deck: DeckId;
    w: number;
    name: string;
    titleY: number;
}) => {
    const { theme } = useRender();
    const { engr } = vintageInks(theme, deck);

    return (
        <>
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
        </>
    );
};

export const VintageFront = ({
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
    const boxH = lineHeight + 2.6;
    const boxY = h - V_INSET - V_BAND - 1.6 - boxH;
    const titleY = full ? 5.4 : framed ? 6.2 : 17.6;
    const bodyTop = full ? 52.5 : framed ? 44 : 28.5;
    const bodyBottom = hasAmount ? boxY - 1.4 : h - V_INSET - V_BAND - 2.2;

    return (
        <>
            {full && photo !== undefined && (
                <VintageFullPhoto
                    deck={deck}
                    w={w}
                    h={h}
                    bleed={bleed}
                    photo={photo}
                />
            )}
            {!full && (
                <VintageEngraving deck={deck} w={w} h={h} framed={framed} />
            )}
            <VintageTitle deck={deck} w={w} name={name} titleY={titleY} />
            {framed && <VintageFramedPhoto deck={deck} w={w} photo={photo} />}
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
                <VintageAmount
                    deck={deck}
                    w={w}
                    boxY={boxY}
                    boxH={boxH}
                    amountText={amountText}
                    lineHeight={lineHeight}
                />
            )}
        </>
    );
};
