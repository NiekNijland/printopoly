import type { PhotoSource } from '@/lib/render/photo';
import {
    DEFAULT_BOARD_PROFILE,
    spaceWidth,
    type BoardProfile,
} from '@/lib/render/print-board';
import { partStyleOf } from '@/lib/render/style';
import { THEMES, type Layout, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import type { Space } from '@/types/game';

import { boardLookOf, spacePaper } from './board-look';
import { SpaceContent } from './board-space-content';
import { PlayfulPhotoTile, SpaceUnderlay } from './board-space-tile';
import { isFullPhoto } from './photo-slot';
import { Frame, Sheet, type ElementProps } from './sheet';
import type { SpaceIconSource } from './space-icon';

export type BoardSpaceProps = {
    space: Space;
    profile?: BoardProfile;
    /** Replaces the name from the game data (the edition's own name for this space). */
    name?: string;
    /** Town of the colour group; shown small above the name of a street. */
    town?: string;
    /** Replaces the short text of a corner: the salary line on Start, the label in the jail, a line under the others. */
    text?: string;
    photo?: PhotoSource;
    /** The chosen icon or uploaded image of a special space (B136); without it the standard icon. */
    icon?: SpaceIconSource;
    /** Draw the thin line around the space; home stickers have none (B65). Default true. */
    frame?: boolean;
    /**
     * Sides of the upright space without that line, because they lie on the cut edge of the board (B253, Ingrid: a
     * line on the trim shows half or not at all when the knife moves half a millimetre).
     */
    openSides?: readonly SpaceSide[];
} & ElementProps;

export type SpaceSide = 'top' | 'right' | 'bottom' | 'left';

/** Upright size of a space: the side along the board edge by the depth towards the centre. */
export const spaceSize = (
    space: Space,
    profile: BoardProfile,
): { w: number; h: number } => {
    return space.type === 'corner'
        ? { w: profile.corner, h: profile.corner }
        : { w: spaceWidth(profile), h: profile.corner };
};

const spaceLayout = (
    space: Space,
    photo: PhotoSource | undefined,
): { layout: Layout; full: boolean } => {
    const isCorner = space.type === 'corner';
    const hasPhoto =
        space.type === 'street' ||
        space.type === 'station' ||
        space.type === 'utility' ||
        isCorner;

    return {
        // The layout follows the photo: with one the space shows it in a frame, without it is text only.
        layout: hasPhoto && photo !== undefined ? 'framed' : 'text',
        // "Full" is for streets, stations and utilities; a corner always keeps its framed photo (B124).
        full: !isCorner && hasPhoto && isFullPhoto(photo),
    };
};

const spaceBackground = (space: Space, theme: Theme): string => {
    return space.type === 'chance' || space.type === 'chest'
        ? theme.deck[space.type]
        : space.type === 'corner'
          ? theme.cornerBackground
          : theme.boardBackground;
};

/** One space of the board, drawn upright. The board places and rotates it (see `Board`). */
export const BoardSpace = ({
    space,
    profile = DEFAULT_BOARD_PROFILE,
    name,
    town,
    text,
    photo,
    icon,
    frame = true,
    openSides = [],
    ...element
}: BoardSpaceProps) => {
    const { w, h } = spaceSize(space, profile);
    const theme = THEMES[element.theme];
    const bleed = element.bleedMm ?? 0;
    const isCorner = space.type === 'corner';
    const { layout: resolved, full } = spaceLayout(space, photo);
    const background = spaceBackground(space, theme);
    // The style of the board (B268): absent draws the theme exactly as before.
    const look = boardLookOf(theme, partStyleOf(element.style, 'board'));
    const paper = spacePaper(theme, look.style, background);
    const playful = look.style === 'playful';
    const content = (
        <SpaceContent
            space={space}
            bleed={bleed}
            w={w}
            h={h}
            name={name}
            town={town}
            text={text}
            layout={resolved}
            full={full}
            photo={photo}
            icon={icon}
        />
    );

    return (
        <Sheet
            {...element}
            element={`space-${space.type}`}
            widthMm={w}
            heightMm={h}
            // Speels lays a tile on the board colour; the board shows in the gap around it.
            background={playful ? theme.boardBackground : paper}
        >
            <SpaceUnderlay
                look={look.style}
                w={w}
                h={h}
                background={background}
                position={space.position}
                corner={isCorner}
                full={full}
            />
            {playful && full ? (
                // Speels keeps a photo over the whole space inside its tile, with the hand-drawn edge on top.
                <PlayfulPhotoTile
                    w={w}
                    h={h}
                    ink={theme.ink}
                    seed={space.position + 1}
                >
                    {content}
                </PlayfulPhotoTile>
            ) : (
                content
            )}
            {frame && !playful && (
                <SpaceEdge
                    w={w}
                    h={h}
                    color={theme.line}
                    openSides={openSides}
                />
            )}
        </Sheet>
    );
};

const SpaceEdge = ({
    w,
    h,
    color,
    openSides,
}: {
    w: number;
    h: number;
    color: string;
    openSides: readonly SpaceSide[];
}) => {
    return openSides.length === 0 ? (
        <Frame x={0} y={0} w={w} h={h} color={color} strokeMm={0.2} />
    ) : (
        <SideLines w={w} h={h} color={color} strokeMm={0.2} open={openSides} />
    );
};

/** The line around a space without the sides on the cut edge of the board. */
const SideLines = ({
    w,
    h,
    color,
    strokeMm,
    open,
}: {
    w: number;
    h: number;
    color: string;
    strokeMm: number;
    open: readonly SpaceSide[];
}) => {
    const half = strokeMm / 2;
    const sides: Record<SpaceSide, [number, number, number, number]> = {
        top: [0, half, w, half],
        right: [w - half, 0, w - half, h],
        bottom: [0, h - half, w, h - half],
        left: [half, 0, half, h],
    };

    return (
        <svg
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: mm(w),
                height: mm(h),
                overflow: 'visible',
            }}
            viewBox={`0 0 ${String(w)} ${String(h)}`}
            aria-hidden="true"
            data-frame=""
        >
            {(Object.keys(sides) as SpaceSide[])
                .filter((side) => !open.includes(side))
                .map((side) => {
                    const [x1, y1, x2, y2] = sides[side];

                    return (
                        <line
                            key={side}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={color}
                            strokeWidth={strokeMm}
                        />
                    );
                })}
        </svg>
    );
};
