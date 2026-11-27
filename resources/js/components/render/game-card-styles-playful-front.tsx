import { mix, readableOn, withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { SPARTAN } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import type { DeckId } from '@/types/game';

import { Pill } from './board-look';
import { ConfettiField, ScallopBadge, WobblyTile } from './card-look-playful';
import { FitText } from './fit-text';
import {
    confettiColors,
    deckIcon,
    type StyledFrontProps,
} from './game-card-styles-shared';
import { PhotoSlot } from './photo-slot';
import { Abs, useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

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

const PlayfulGround = ({
    deck,
    w,
    h,
    bleed,
    photo,
    full,
    seed,
}: {
    deck: DeckId;
    w: number;
    h: number;
    bleed: number;
    photo: PhotoSource | undefined;
    full: boolean;
    seed: number;
}) => {
    const { theme } = useRender();

    return full && photo !== undefined ? (
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
    );
};

const PlayfulFramedPhoto = ({
    deck,
    w,
    photo,
    seed,
}: {
    deck: DeckId;
    w: number;
    photo: PhotoSource;
    seed: number;
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];

    return (
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
    );
};

const PlayfulAmount = ({
    deck,
    w,
    pillY,
    pillH,
    amountText,
    lineHeight,
}: {
    deck: DeckId;
    w: number;
    pillY: number;
    pillH: number;
    amountText: string;
    lineHeight: number;
}) => {
    const { theme } = useRender();
    const accent = theme.deckAccent[deck];

    return (
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
    );
};

export const PlayfulFront = ({
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
    const pillH = lineHeight + 3;
    const pillY = h - 6.4 - pillH;
    const bodyTop = full ? 53 : framed ? 46.5 : 20;
    const bodyBottom = hasAmount ? pillY - 1.6 : h - 7;
    const seed = deck === 'chance' ? 11 : 23;

    return (
        <>
            <PlayfulGround
                deck={deck}
                w={w}
                h={h}
                bleed={bleed}
                photo={photo}
                full={full}
                seed={seed}
            />
            <PlayfulTitle
                deck={deck}
                w={w}
                name={name}
                slot={full ? 'title-band' : undefined}
            />
            {framed && (
                <PlayfulFramedPhoto
                    deck={deck}
                    w={w}
                    photo={photo}
                    seed={seed}
                />
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
                <PlayfulAmount
                    deck={deck}
                    w={w}
                    pillY={pillY}
                    pillH={pillH}
                    amountText={amountText}
                    lineHeight={lineHeight}
                />
            )}
        </>
    );
};
