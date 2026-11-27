import {
    centerLayout,
    type CenterLayout,
    type CenterPlace,
} from '@/lib/render/center-layout';
import { cornerRotation } from '@/lib/render/corner-layout';
import type { ResolvedCenter } from '@/lib/render/edition-resolve';
import type { TitleStyle } from '@/lib/render/edition-types';
import type { PhotoSource } from '@/lib/render/photo';
import {
    centerRect,
    DEFAULT_BOARD_PROFILE,
    spaceRects,
    type BoardProfile,
} from '@/lib/render/print-board';
import { standardEdition, spaceAt } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import type { DeckId, Space } from '@/types/game';

import { CenterContent } from './board-center-content';
import { BoardSpace, type SpaceSide } from './board-space';
import { FRAME_INSET, type EditionTitleProps } from './edition-title';
import type { RenderLayer } from './free-layers';
import { Abs, Sheet, type ElementProps } from './sheet';
import type { SpaceIconSource } from './space-icon';

export type CardSpot = {
    deck: DeckId;
    /** Centre of the spot in mm, relative to the centre area of the board. */
    cx: number;
    cy: number;
    /** Card size (B57: the spot has the size of the card). */
    w: number;
    h: number;
    /** Degrees clockwise. */
    rotation: number;
};

/** The two card spots in the centre of the board: Community Chest top left, Chance bottom right, both on the diagonal. */
export const cardSpots = (
    profile: BoardProfile = DEFAULT_BOARD_PROFILE,
): CardSpot[] => {
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
};

/** The edition title options of the board centre (B125). */
export type CenterTitle = {
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
    /** The look of the name (Niek, 22 nov); the plate of the theme when absent. */
    style?: TitleStyle;
};

/** The title options of a resolved centre, with the photo as the caller's renderer takes it. */
export const centerTitleOf = (
    centre: ResolvedCenter,
    photo: PhotoSource | undefined,
    background?: PhotoSource,
): CenterTitle => {
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
        style: centre.titleStyle,
    };
};

/** The layout of a centre title as the renderer draws it (B187), also for the editor and the checks. */
export const layoutOfTitle = (
    profile: BoardProfile,
    title: CenterTitle,
    withImage = title.photo !== undefined,
): CenterLayout => {
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
};

export type BoardCenterProps = {
    editionName: string;
    title?: CenterTitle;
    profile?: BoardProfile;
    /** Edition name large on the free diagonal (B89, the default); `false` keeps it small and flat. */
    diagonalName?: boolean;
    /** Free text and photo layers, in mm from the top left of the centre. */
    layers?: readonly RenderLayer[];
} & ElementProps;

/** The open middle of the board: the edition name and the two card spots. Sized by the board profile. */
export const BoardCenter = ({
    editionName,
    profile = DEFAULT_BOARD_PROFILE,
    diagonalName = true,
    layers,
    title,
    ...element
}: BoardCenterProps) => {
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
                layout={layoutOfTitle(profile, title ?? {})}
                spots={cardSpots(profile)}
                photoBleed={element.bleedMm ?? 0}
            />
        </Sheet>
    );
};

export type SpaceOverride = {
    /** The space with the amounts of the edition (B132); the standard space when absent. */
    space?: Space;
    name?: string;
    town?: string;
    /** Short text on a corner. */
    text?: string;
    photo?: PhotoSource;
    /** The chosen icon or uploaded image of a special space (B136). */
    icon?: SpaceIconSource;
};

export type BoardProps = {
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
} & ElementProps;

/** The whole board at true size: 40 spaces, rotated to face the centre, and the centre. */
export const Board = ({
    editionName,
    profile = DEFAULT_BOARD_PROFILE,
    spaces = {},
    centerLayers,
    centerTitle,
    diagonalName = true,
    ...element
}: BoardProps) => {
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
                    layout={layoutOfTitle(profile, centerTitle ?? {})}
                    spots={cardSpots(profile)}
                />
            </Abs>
            {spaceRects(profile).map((plain) => {
                // A corner turns with its place on the board like the spaces next to it (Niek, feedback 22 nov).
                const rect =
                    plain.side === 'corner'
                        ? { ...plain, rotation: cornerRotation(plain.position) }
                        : plain;
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
};

/** Closer to the cut edge than this, a line between spaces is left off on that side (B253). */
const EDGE_CLEARANCE_MM = 2;

const SIDES: readonly SpaceSide[] = ['top', 'right', 'bottom', 'left'];

/**
 * The sides of a space, upright, that lie on the outer edge of the board. A space turned by 90° shows its upright
 * top on the right of the board, so a side of the board maps back by the turn.
 */
const edgeSides = (
    rect: { x: number; y: number; w: number; h: number; rotation: number },
    profile: BoardProfile,
): SpaceSide[] => {
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
};
