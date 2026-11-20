import { standardEdition, spaceAt } from '@/lib/game/standard-edition';
import type { DeckId } from '@/lib/game/types';
import {
    centerRect,
    DEFAULT_BOARD_PROFILE,
    spaceRects,
    type BoardProfile,
} from '@/lib/print/board';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { BoardSpace } from './board-space';
import { FitText } from './fit-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import { Icon } from './icons';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

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

export interface BoardCenterProps extends ElementProps {
    editionName: string;
    profile?: BoardProfile;
    /** Edition name large on the free diagonal (B89, the default); `false` keeps it small and flat. */
    diagonalName?: boolean;
    /** Free text and photo layers, in mm from the top left of the centre. */
    layers?: readonly RenderLayer[];
}

function CenterContent({
    editionName,
    profile,
    diagonalName,
    layers = [],
}: {
    editionName: string;
    profile: BoardProfile;
    diagonalName: boolean;
    layers?: readonly RenderLayer[];
}) {
    const { theme, locale } = useRender();
    const t = STRINGS[locale];
    const centre = centerRect(profile);
    const deckName = (deck: DeckId) =>
        standardEdition.spaces.find((space) => space.type === deck)?.name[
            locale
        ] ?? deck;

    return (
        <>
            {diagonalName ? (
                <Abs
                    x={centre.w / 2 - centre.w * 0.4}
                    y={centre.h / 2 - centre.h * 0.12}
                    w={centre.w * 0.8}
                    h={centre.h * 0.24}
                    style={{ transform: 'rotate(-45deg)' }}
                    slot="edition-name-diagonal"
                >
                    <FitText
                        text={editionName}
                        x={0}
                        y={0}
                        w={centre.w * 0.8}
                        h={centre.h * 0.24}
                        maxFontMm={34}
                        minFontMm={6}
                        font="heading"
                        color={theme.accent}
                        align="center"
                        valign="middle"
                        slot="edition-name"
                    />
                </Abs>
            ) : (
                <FitText
                    text={editionName}
                    x={centre.w * 0.1}
                    y={centre.h * 0.42}
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
            />
        </Sheet>
    );
}

export interface SpaceOverride {
    name?: string;
    photo?: PhotoSource;
}

export interface BoardProps extends ElementProps {
    editionName: string;
    profile?: BoardProfile;
    /** Free layers on the centre of the board, in mm from the top left of the centre. */
    centerLayers?: readonly RenderLayer[];
    /** Per-position changes to the standard spaces. */
    spaces?: Readonly<Record<number, SpaceOverride>>;
    placeholder?: boolean;
    /** See `BoardCenterProps`. */
    diagonalName?: boolean;
}

/** The whole board at true size: 40 spaces, rotated to face the centre, and the centre. */
export function Board({
    editionName,
    profile = DEFAULT_BOARD_PROFILE,
    spaces = {},
    centerLayers,
    placeholder = false,
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
                            space={spaceAt(rect.position)}
                            profile={profile}
                            name={override?.name}
                            photo={override?.photo}
                            placeholder={placeholder}
                        />
                    </div>
                );
            })}
        </Sheet>
    );
}
