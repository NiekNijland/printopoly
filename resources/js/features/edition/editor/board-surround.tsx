import { memo, useState } from 'react';

import { Board, boardPropsOf } from '@/components/render';
import { editorSources } from '@/components/render/editor-element-preview';
import type { StageView } from '@/features/edition/editor/element-stage';
import { useTranslation } from '@/hooks/use-translation';
import { cornerRotation } from '@/lib/render/corner-layout';
import { BOARD_CENTER_KEY, spaceKey } from '@/lib/render/edition-keys';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import {
    centerRect,
    spaceRects,
    type BoardProfile,
} from '@/lib/render/print-board';
import { mm } from '@/lib/render/units';

/**
 * Where the shown part lies on the board: its centre in mm and the turn that makes it upright, as the stage shows
 * it. `null` for anything that is not on the board.
 */
export function placeOnBoard(
    key: string,
    profile: BoardProfile,
): { x: number; y: number; rotation: number } | null {
    if (key === BOARD_CENTER_KEY) {
        const centre = centerRect(profile);

        return {
            x: centre.x + centre.w / 2,
            y: centre.y + centre.h / 2,
            rotation: 0,
        };
    }
    if (!key.startsWith('space.')) {
        return null;
    }
    const rect = spaceRects(profile).find(
        (item) => item.position === Number(key.slice(6)),
    );
    if (rect === undefined) {
        return null;
    }

    return {
        x: rect.x + rect.w / 2,
        y: rect.y + rect.h / 2,
        rotation:
            rect.side === 'corner'
                ? cornerRotation(rect.position)
                : rect.rotation,
    };
}

const SurroundBoard = memo(function SurroundBoard({
    resolved,
    photos,
}: {
    resolved: ResolvedEdition;
    photos: PhotoInfos;
}) {
    return <Board {...boardPropsOf(resolved, editorSources(photos))} />;
});

interface BoardHitAreasProps {
    resolved: ResolvedEdition;
    /** A key without a hit area: the part the stage already shows. */
    skip?: string;
    /** Screen pixels per CSS pixel of the board, so the hover line and the name stay the same size on screen. */
    scale: number;
    /** The turn of the board on screen; the name turns back so it stands upright. */
    rotation: number;
    /** `faded`: the board is greyed out and a hovered space lights up. `full`: the board is in colour, so it darkens. */
    tone: 'faded' | 'full';
    onPick: (key: string) => void;
}

/**
 * A button over every space and the centre of the board, in mm on the board itself. Hovering one draws an ink line
 * round it with its name on a label; a click opens it. For the mouse only: the keyboard has the list and the arrows.
 */
export function BoardHitAreas({
    resolved,
    skip,
    scale,
    rotation,
    tone,
    onPick,
}: BoardHitAreasProps) {
    const t = useTranslation();
    const [hovered, setHovered] = useState<string | null>(null);
    const profile = resolved.boardProfile;
    const targets = [
        ...spaceRects(profile).map((rect) => ({
            key: spaceKey(rect.position),
            rect,
            label: resolved.spaces[rect.position]?.name ?? '',
        })),
        {
            key: BOARD_CENTER_KEY,
            rect: centerRect(profile),
            label: t('editor.center'),
        },
    ].filter((target) => target.key !== skip);

    return targets.map(({ key, rect, label }) => (
        <button
            key={key}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            data-surround-key={key}
            onClick={() => onPick(key)}
            onPointerEnter={() => setHovered(key)}
            onPointerLeave={() =>
                setHovered((now) => (now === key ? null : now))
            }
            className={
                tone === 'faded'
                    ? 'absolute cursor-pointer bg-transparent transition-[background-color,box-shadow] duration-150 hover:bg-paper/55'
                    : 'absolute cursor-pointer bg-transparent transition-[background-color,box-shadow] duration-150 hover:bg-ink/8'
            }
            style={{
                left: mm(rect.x),
                top: mm(rect.y),
                width: mm(rect.w),
                height: mm(rect.h),
                boxShadow:
                    hovered === key
                        ? `inset 0 0 0 ${2 / scale}px var(--color-ink)`
                        : undefined,
            }}
        >
            {hovered === key && label !== '' && (
                <span
                    className="pointer-events-none absolute top-1/2 left-1/2 z-10 rounded-full border-2 border-ink bg-paper px-3 py-0.5 text-sm font-semibold whitespace-nowrap text-ink shadow-[2px_2px_0_var(--color-ink)]"
                    style={{
                        // Upright and at screen size, whatever the turn and scale of the board.
                        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${1 / scale})`,
                    }}
                >
                    {label}
                </span>
            )}
        </button>
    ));
}

interface BoardSurroundProps {
    resolved: ResolvedEdition;
    photos: PhotoInfos;
    /** The key the stage shows: a space or the centre. */
    selected: string;
    pxPerMm: number;
    /** The zoom and shift of the stage view, applied to the board here so the fade stays at the edges of the stage. */
    view?: StageView;
    onPick: (key: string) => void;
}

/**
 * The rest of the board, faded, around the space on the stage (Niek, 24 nov): it shows that the space is a piece of
 * the board, and a click on a neighbour opens that one. The board turns so the chosen space stands upright, as on
 * the stage.
 */
export function BoardSurround({
    resolved,
    photos,
    selected,
    pxPerMm,
    view = { zoom: 1, x: 0, y: 0 },
    onPick,
}: BoardSurroundProps) {
    const profile = resolved.boardProfile;
    const place = placeOnBoard(selected, profile);
    if (place === null) {
        return null;
    }
    const scale = pxPerMm / (96 / 25.4);

    return (
        <div
            aria-hidden="true"
            data-board-surround=""
            // The board fades into the table towards the edges of the stage, so it never ends in a hard cut.
            className="absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_92%)]"
        >
            <div
                className="absolute top-1/2 left-1/2 size-0"
                style={{
                    transformOrigin: '0 0',
                    transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        width: mm(profile.outer),
                        height: mm(profile.outer),
                        transformOrigin: '0 0',
                        transform: `scale(${scale}) rotate(${-place.rotation}deg) translate(${mm(-place.x)}, ${mm(-place.y)})`,
                    }}
                >
                    <div className="pointer-events-none opacity-35 saturate-[.35]">
                        <SurroundBoard resolved={resolved} photos={photos} />
                    </div>
                    <BoardHitAreas
                        resolved={resolved}
                        skip={selected}
                        scale={scale * view.zoom}
                        rotation={place.rotation}
                        tone="faded"
                        onPick={onPick}
                    />
                </div>
            </div>
        </div>
    );
}
