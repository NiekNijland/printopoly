import type { ReactNode } from 'react';

import type { CenterLayout, PlacedBox } from '@/lib/render/center-layout';
import { centerRect, type BoardProfile } from '@/lib/render/print-board';
import { standardEdition } from '@/lib/render/standard-edition';
import { STRINGS } from '@/lib/render/strings';
import { mm } from '@/lib/render/units';
import type { DeckId } from '@/types/game';

import { BackgroundPhoto } from './background-photo';
import type { CardSpot, CenterTitle } from './board';
import { EditionTitle, FRAME_INSET, FramedPhoto } from './edition-title';
import { FitText } from './fit-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import { Icon } from './icons';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, useRender, BoxSvg } from './sheet';

/** A turned box of the centre layout, as an absolutely placed element. */
const Placed = ({
    box,
    slot,
    children,
}: {
    box: PlacedBox;
    slot: string;
    children: ReactNode;
}) => {
    return (
        <Abs
            x={box.cx - box.w / 2}
            y={box.cy - box.h / 2}
            w={box.w}
            h={box.h}
            style={
                box.rotation === 0
                    ? undefined
                    : { transform: `rotate(${box.rotation}deg)` }
            }
            slot={slot}
        >
            {children}
        </Abs>
    );
};

/** A card spot over a photo: a dotted outline and a soft paper plate behind the label, so the text reads (B125). */
const SpotOutline = ({
    w,
    h,
    radiusMm,
    color,
    label,
}: {
    w: number;
    h: number;
    radiusMm: number;
    color: string;
    label: string;
}) => {
    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: mm(4),
                    top: mm(h / 2 - 28),
                    width: mm(w - 8),
                    height: mm(46),
                    background: label,
                    opacity: 0.86,
                    borderRadius: mm(radiusMm),
                }}
                data-slot="spot-plate"
            />
            <BoxSvg w={w} h={h} overflow="visible" data-frame="">
                <rect
                    x={0.6}
                    y={0.6}
                    width={w - 1.2}
                    height={h - 1.2}
                    rx={radiusMm}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.2}
                    strokeDasharray="0.1 2.6"
                    strokeLinecap="round"
                />
            </BoxSvg>
        </>
    );
};

/** How far the gold frame of Gala sits inside the middle of the board, in mm. */
const CENTRE_FRAME_MM = 7;

export const CenterContent = ({
    editionName,
    profile,
    diagonalName,
    layout,
    spots,
    layers = [],
    title = {},
    photoBleed = 0,
}: {
    editionName: string;
    profile: BoardProfile;
    diagonalName: boolean;
    layout: CenterLayout;
    spots: readonly CardSpot[];
    layers?: readonly RenderLayer[];
    title?: CenterTitle;
    /** How far the photo over the whole centre shows past the centre: the bleed of a home sticker (R5-03). */
    photoBleed?: number;
}) => {
    const { theme } = useRender();
    const centre = centerRect(profile);
    const background = title.background;

    return (
        <>
            {background !== undefined && (
                <BackgroundPhoto
                    photo={background}
                    w={centre.w}
                    h={centre.h}
                    bleed={photoBleed}
                />
            )}
            {/* Gala frames the middle with a gold double line, like its cards (B247); a photo over it goes without. */}
            {background === undefined && theme.ornament !== undefined && (
                <Frame
                    x={CENTRE_FRAME_MM}
                    y={CENTRE_FRAME_MM}
                    w={centre.w - 2 * CENTRE_FRAME_MM}
                    h={centre.h - 2 * CENTRE_FRAME_MM}
                    color={theme.accent}
                    strokeMm={0.5}
                    ornate
                />
            )}
            {/* The photo and the logo come before the plate: the first photo slot is the one the print crops for. */}
            <CenterImages layout={layout} title={title} unit={centre.w / 360} />
            <CenterName
                editionName={editionName}
                profile={profile}
                diagonalName={diagonalName}
                layout={layout}
                title={title}
            />
            {spots.map((spot) => (
                <CardSpotArt
                    key={spot.deck}
                    spot={spot}
                    photoBehind={background !== undefined}
                />
            ))}
            <FreeLayers layers={layers} />
        </>
    );
};

const CenterImages = ({
    layout,
    title,
    unit,
}: {
    layout: CenterLayout;
    title: CenterTitle;
    unit: number;
}) => {
    return (
        <>
            {layout.logo !== null && (
                <Placed box={layout.logo} slot="center-logo">
                    <PhotoSlot
                        x={0}
                        y={0}
                        w={layout.logo.w}
                        h={layout.logo.h}
                        photo={title.photo}
                    />
                </Placed>
            )}
            {layout.photo !== null && (
                <Placed box={layout.photo} slot="center-photo">
                    <FramedPhoto
                        x={0}
                        y={0}
                        w={layout.photo.w}
                        h={layout.photo.h}
                        photo={title.photo}
                        frame={title.photoFrame ?? true}
                        inset={
                            (title.photoFrame ?? true) ? FRAME_INSET * unit : 0
                        }
                        unit={unit}
                        // Straight in its own square (B216): the plate does not lean on it there.
                        tilt={0}
                    />
                </Placed>
            )}
        </>
    );
};

const CenterName = ({
    editionName,
    profile,
    diagonalName,
    layout,
    title,
}: {
    editionName: string;
    profile: BoardProfile;
    diagonalName: boolean;
    layout: CenterLayout;
    title: CenterTitle;
}) => {
    const { theme, locale } = useRender();
    const t = STRINGS[locale];
    const centre = centerRect(profile);
    const mode = title.mode ?? 'name';
    // The flat name of the old layout moves with the title height, as before.
    const shift =
        Math.min(1, Math.max(-1, title.offset ?? 0)) * 0.12 * centre.h;
    const tagline = title.subtitle ?? t.centerTagline;

    return mode === 'logo' &&
        title.photo !== undefined ? null : title.hidden ===
      true ? null : diagonalName ? (
        <Placed box={layout.title} slot="edition-name-diagonal">
            <EditionTitle
                name={editionName}
                tagline={tagline}
                // Apart from the plate the photo has its own square (B187); over the middle it stands on it.
                mode={layout.photo === null ? mode : 'name'}
                photo={title.photo}
                photoAspect={title.photoAspect}
                photoRotation={title.photoRotation ?? 0}
                photoFrame={title.photoFrame ?? true}
                w={layout.title.w}
                h={layout.title.h}
                unit={layout.title.unit}
                titleStyle={title.style}
            />
        </Placed>
    ) : (
        <FitText
            text={editionName}
            x={centre.w * 0.1}
            y={centre.h * 0.42 + 2 * shift}
            w={centre.w * 0.8}
            h={centre.h * 0.16}
            maxFontMm={18 * theme.titleScale}
            minFontMm={5}
            font="title"
            color={theme.accent}
            align="center"
            slot="edition-name"
        />
    );
};

const CardSpotArt = ({
    spot,
    photoBehind,
}: {
    spot: CardSpot;
    photoBehind: boolean;
}) => {
    const { theme, locale, words } = useRender();
    const t = STRINGS[locale];
    const deckName = (deck: DeckId) =>
        words.decks?.[deck] ??
        standardEdition.spaces.find((space) => space.type === deck)?.name[
            locale
        ] ??
        deck;

    return (
        <Abs
            key={spot.deck}
            x={spot.cx - spot.w / 2}
            y={spot.cy - spot.h / 2}
            w={spot.w}
            h={spot.h}
            style={{ transform: `rotate(${spot.rotation}deg)` }}
            slot={`card-spot-${spot.deck}`}
        >
            {!photoBehind ? (
                <Frame
                    x={0}
                    y={0}
                    w={spot.w}
                    h={spot.h}
                    color={theme.ink}
                    strokeMm={0.4}
                    radiusMm={theme.cardRadiusMm}
                    fill={theme.deck[spot.deck]}
                />
            ) : (
                <SpotOutline
                    w={spot.w}
                    h={spot.h}
                    radiusMm={theme.cardRadiusMm}
                    color={theme.paper}
                    label={theme.paper}
                />
            )}
            <Icon
                name={spot.deck === 'chance' ? 'dice' : 'chest'}
                x={spot.w / 2 - 7}
                y={spot.h / 2 - 24}
                size={14}
                color={theme.deckAccent[spot.deck]}
                strokeWidth={1.4}
            />
            <FitText
                text={deckName(spot.deck)}
                x={4}
                y={spot.h / 2 - 8}
                w={spot.w - 8}
                h={11}
                maxFontMm={8}
                minFontMm={4}
                font="heading"
                align="center"
                slot={`spot-name-${spot.deck}`}
            />
            <FitText
                text={t.cardSpot}
                x={6}
                y={spot.h / 2 + 5}
                w={spot.w - 12}
                h={8}
                maxFontMm={3.6}
                minFontMm={3}
                wrap="words"
                font="body"
                align="center"
            />
        </Abs>
    );
};
