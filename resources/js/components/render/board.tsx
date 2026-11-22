import type { ReactNode } from 'react';

import type { ResolvedCenter } from '@/lib/edition/resolve';
import { standardEdition, spaceAt } from '@/lib/game/standard-edition';
import type { DeckId, Space } from '@/lib/game/types';
import {
    centerRect,
    DEFAULT_BOARD_PROFILE,
    spaceRects,
    type BoardProfile,
} from '@/lib/print/board';
import {
    centerLayout,
    type CenterLayout,
    type CenterPlace,
    type PlacedBox,
} from '@/lib/render/center-layout';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { BackgroundPhoto } from './background-photo';
import { BoardSpace, type SpaceSide } from './board-space';
import {
    EditionTitle,
    FRAME_INSET,
    FramedPhoto,
    type EditionTitleProps,
} from './edition-title';
import { FitText } from './fit-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import { Icon } from './icons';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';
import type { SpaceIconSource } from './space-icon';

export interface CardSpot {
    deck: DeckId;
    /** Centre of the spot in mm, relative to the centre area of the board. */
    cx: number;
    cy: number;
    /** Card size (B57: the spot has the size of the card). */
    w: number;
    h: number;
    /** Degrees clockwise. */
    rotation: number;
}

/** The two card spots in the centre of the board: Community Chest top left, Chance bottom right, both on the diagonal. */
export function cardSpots(
    profile: BoardProfile = DEFAULT_BOARD_PROFILE,
): CardSpot[] {
    const centre = centerRect(profile);
    const { width, height } = standardEdition.components.cardSizeMm;

    return [
        {
            deck: 'chest',
            cx: centre.w * 0.27,
            cy: centre.h * 0.27,
            w: width,
            h: height,
            rotation: 45,
        },
        {
            deck: 'chance',
            cx: centre.w * 0.73,
            cy: centre.h * 0.73,
            w: width,
            h: height,
            rotation: 45,
        },
    ];
}

/** The edition title options of the board centre (B125). */
export interface CenterTitle {
    mode?: EditionTitleProps['mode'];
    /** Line under the name: `undefined` for the standard tagline, `''` for none. */
    subtitle?: string;
    photo?: PhotoSource;
    photoAspect?: number;
    photoRotation?: number;
    photoFrame?: boolean;
    /** Photo over the whole centre, behind the card spots and the title (B125). */
    background?: PhotoSource;
    /** Where the title sits, from -1 (up) to 1 (down); 0 is the middle (B170). */
    offset?: number;
    /** Size of the title ribbon, 0.5 to 1 (B170). */
    scale?: number;
    /** No title ribbon at all (B170). */
    hidden?: boolean;
    /** Where title, photo and logo sit (B187); the free square top right when absent. */
    place?: CenterPlace;
    /** The logo lies on the diagonal (B187); straight when absent. */
    logoTilt?: boolean;
}

/** The title options of a resolved centre, with the photo as the caller's renderer takes it. */
export function centerTitleOf(
    centre: ResolvedCenter,
    photo: PhotoSource | undefined,
    background?: PhotoSource,
): CenterTitle {
    return {
        mode: centre.mode,
        subtitle: centre.subtitle,
        photo,
        photoAspect: centre.photoAspect,
        photoRotation: centre.photo?.rotation ?? 0,
        photoFrame: centre.photoFrame,
        background,
        offset: centre.titleOffset,
        scale: centre.titleScale,
        hidden: centre.titleHidden,
        place: centre.place,
        logoTilt: centre.logoTilt,
    };
}

/** The layout of a centre title as the renderer draws it (B187), also for the editor and the checks. */
export function layoutOfTitle(
    profile: BoardProfile,
    title: CenterTitle,
    withImage = title.photo !== undefined,
): CenterLayout {
    const mode = title.mode ?? 'name';
    const hasImage = mode !== 'name' && withImage;
    const rotation = title.photoRotation ?? 0;
    const raw = title.photoAspect ?? (mode === 'logo' ? 3 : 4 / 3);
    const aspect = Math.round(rotation / 90) % 2 === 0 ? raw : 1 / raw;
    const unit = centerRect(profile).w / 360;

    return centerLayout(profile, {
        mode: hasImage ? mode : 'name',
        place: title.place ?? 'topRight',
        scale: title.scale ?? 1,
        offset: title.offset ?? 0,
        aspect,
        logoTilt: title.logoTilt === true,
        frameInset: (title.photoFrame ?? true) ? FRAME_INSET * unit : 0,
    });
}

/** A turned box of the centre layout, as an absolutely placed element. */
function Placed({
    box,
    slot,
    children,
}: {
    box: PlacedBox;
    slot: string;
    children: ReactNode;
}) {
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
}

export interface BoardCenterProps extends ElementProps {
    editionName: string;
    title?: CenterTitle;
    profile?: BoardProfile;
    /** Edition name large on the free diagonal (B89, the default); `false` keeps it small and flat. */
    diagonalName?: boolean;
    /** Free text and photo layers, in mm from the top left of the centre. */
    layers?: readonly RenderLayer[];
}

/** A card spot over a photo: a dotted outline and a soft paper plate behind the label, so the text reads (B125). */
function SpotOutline({
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
}) {
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
            <svg
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: mm(w),
                    height: mm(h),
                    overflow: 'visible',
                }}
                viewBox={`0 0 ${w} ${h}`}
                aria-hidden="true"
                data-frame=""
            >
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
            </svg>
        </>
    );
}

function CenterContent({
    editionName,
    profile,
    diagonalName,
    layers = [],
    title = {},
    photoBleed = 0,
}: {
    editionName: string;
    profile: BoardProfile;
    diagonalName: boolean;
    layers?: readonly RenderLayer[];
    title?: CenterTitle;
    /** How far the photo over the whole centre shows past the centre: the bleed of a home sticker (R5-03). */
    photoBleed?: number;
}) {
    const { theme, locale, words } = useRender();
    const t = STRINGS[locale];
    const centre = centerRect(profile);
    const deckName = (deck: DeckId) =>
        words.decks?.[deck] ??
        standardEdition.spaces.find((space) => space.type === deck)?.name[
            locale
        ] ??
        deck;

    const background = title.background;
    const layout = layoutOfTitle(profile, title);
    const mode = title.mode ?? 'name';
    // The flat name of the old layout moves with the title height, as before.
    const shift =
        Math.min(1, Math.max(-1, title.offset ?? 0)) * 0.12 * centre.h;
    const tagline =
        title.subtitle === undefined ? t.centerTagline : title.subtitle;

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
            {/* The photo and the logo come before the plate: the first photo slot is the one the print crops for. */}
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
                            (title.photoFrame ?? true)
                                ? FRAME_INSET * (centre.w / 360)
                                : 0
                        }
                        unit={centre.w / 360}
                        // Straight in its own square (B216): the plate does not lean on it there.
                        tilt={0}
                    />
                </Placed>
            )}
            {mode === 'logo' &&
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
                    />
                </Placed>
            ) : (
                <FitText
                    text={editionName}
                    x={centre.w * 0.1}
                    y={centre.h * 0.42 + 2 * shift}
                    w={centre.w * 0.8}
                    h={centre.h * 0.16}
                    maxFontMm={18}
                    minFontMm={5}
                    font="heading"
                    color={theme.accent}
                    align="center"
                    slot="edition-name"
                />
            )}
            {cardSpots(profile).map((spot) => (
                <Abs
                    key={spot.deck}
                    x={spot.cx - spot.w / 2}
                    y={spot.cy - spot.h / 2}
                    w={spot.w}
                    h={spot.h}
                    style={{ transform: `rotate(${spot.rotation}deg)` }}
                    slot={`card-spot-${spot.deck}`}
                >
                    {background === undefined ? (
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
            ))}
            <FreeLayers layers={layers} />
        </>
    );
}

/** The open middle of the board: the edition name and the two card spots. Sized by the board profile. */
export function BoardCenter({
    editionName,
    profile = DEFAULT_BOARD_PROFILE,
    diagonalName = true,
    layers,
    title,
    ...element
}: BoardCenterProps) {
    const centre = centerRect(profile);

    return (
        <Sheet
            {...element}
            element="board-center"
            widthMm={centre.w}
            heightMm={centre.h}
            background={THEMES[element.theme].boardBackground}
        >
            <CenterContent
                editionName={editionName}
                profile={profile}
                diagonalName={diagonalName}
                layers={layers}
                title={title}
                photoBleed={element.bleedMm ?? 0}
            />
        </Sheet>
    );
}

export interface SpaceOverride {
    /** The space with the amounts of the edition (B132); the standard space when absent. */
    space?: Space;
    name?: string;
    town?: string;
    /** Short text on a corner. */
    text?: string;
    photo?: PhotoSource;
    /** The chosen icon or uploaded image of a special space (B136). */
    icon?: SpaceIconSource;
}

export interface BoardProps extends ElementProps {
    editionName: string;
    profile?: BoardProfile;
    /** Free layers on the centre of the board, in mm from the top left of the centre. */
    centerLayers?: readonly RenderLayer[];
    /** Edition title options of the centre (B125). */
    centerTitle?: CenterTitle;
    /** Per-position changes to the standard spaces. */
    spaces?: Readonly<Record<number, SpaceOverride>>;
    /** See `BoardCenterProps`. */
    diagonalName?: boolean;
}

/** The whole board at true size: 40 spaces, rotated to face the centre, and the centre. */
export function Board({
    editionName,
    profile = DEFAULT_BOARD_PROFILE,
    spaces = {},
    centerLayers,
    centerTitle,
    diagonalName = true,
    ...element
}: BoardProps) {
    const theme = THEMES[element.theme];
    const centre = centerRect(profile);

    return (
        <Sheet
            {...element}
            element="board"
            widthMm={profile.outer}
            heightMm={profile.outer}
            background={theme.boardBackground}
        >
            <Abs x={centre.x} y={centre.y} w={centre.w} h={centre.h}>
                <CenterContent
                    editionName={editionName}
                    profile={profile}
                    diagonalName={diagonalName}
                    layers={centerLayers}
                    title={centerTitle}
                />
            </Abs>
            {spaceRects(profile).map((rect) => {
                const upright =
                    rect.rotation === 90 || rect.rotation === 270
                        ? { w: rect.h, h: rect.w }
                        : { w: rect.w, h: rect.h };
                const override = spaces[rect.position];

                return (
                    <div
                        key={rect.position}
                        data-position={rect.position}
                        style={{
                            position: 'absolute',
                            left: mm(rect.x + rect.w / 2 - upright.w / 2),
                            top: mm(rect.y + rect.h / 2 - upright.h / 2),
                            width: mm(upright.w),
                            height: mm(upright.h),
                            transform: `rotate(${rect.rotation}deg)`,
                        }}
                    >
                        <BoardSpace
                            theme={element.theme}
                            locale={element.locale}
                            currency={element.currency}
                            words={element.words}
                            style={element.style}
                            space={override?.space ?? spaceAt(rect.position)}
                            profile={profile}
                            name={override?.name}
                            town={override?.town}
                            text={override?.text}
                            photo={override?.photo}
                            icon={override?.icon}
                            openSides={edgeSides(rect, profile)}
                        />
                    </div>
                );
            })}
        </Sheet>
    );
}

/** Closer to the cut edge than this, a line between spaces is left off on that side (B253). */
const EDGE_CLEARANCE_MM = 2;

const SIDES: readonly SpaceSide[] = ['top', 'right', 'bottom', 'left'];

/**
 * The sides of a space, upright, that lie on the outer edge of the board. A space turned by 90° shows its upright
 * top on the right of the board, so a side of the board maps back by the turn.
 */
export function edgeSides(
    rect: { x: number; y: number; w: number; h: number; rotation: number },
    profile: BoardProfile,
): SpaceSide[] {
    const onBoard: SpaceSide[] = [];

    if (rect.y < EDGE_CLEARANCE_MM) onBoard.push('top');
    if (profile.outer - (rect.x + rect.w) < EDGE_CLEARANCE_MM)
        onBoard.push('right');
    if (profile.outer - (rect.y + rect.h) < EDGE_CLEARANCE_MM)
        onBoard.push('bottom');
    if (rect.x < EDGE_CLEARANCE_MM) onBoard.push('left');

    const turns = Math.round(rect.rotation / 90);

    return onBoard.map(
        (side) => SIDES[(((SIDES.indexOf(side) - turns) % 4) + 4) % 4] ?? side,
    );
}
