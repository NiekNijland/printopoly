import type { CSSProperties, PointerEvent, ReactNode } from 'react';

import { WarningIcon } from '@/components/ui/icons';
import {
    bandStyle,
    canSwapKeys,
    gridCell,
    groupColor,
    miniPhotoBox,
} from '@/features/edition/editor/board-grid';
import { MiniCenter } from '@/features/edition/editor/mini-center';
import type {
    BoardDrag,
    useBoardSwap,
} from '@/features/edition/editor/use-board-swap';
import { BOARD_CENTER_KEY, spaceKey } from '@/lib/render/edition-keys';
import type { Edition } from '@/lib/render/edition-types';
import { isCustomized } from '@/lib/render/editor-catalogue';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { THEMES } from '@/lib/render/themes';
import { cn } from '@/lib/utils';
import type { Space } from '@/types/game';

/**
 * The chosen space over the real board: a thick ink line inside the space with a paper line within it, so it
 * shows on a light and on a dark board.
 */
export const OVERLAY_SELECTED =
    'z-10 outline-4 -outline-offset-4 outline-ink shadow-[inset_0_0_0_7px_var(--color-paper)]';

type CellState = {
    key: string;
    selected: boolean;
    blocked: boolean;
    swapFrom: string | null;
    swapTarget: string | null;
    drag: BoardDrag | null;
};

export const spaceCellClass = (overlay: boolean, cell: CellState): string => {
    const { key, selected, blocked, swapFrom, swapTarget, drag } = cell;

    return overlay
        ? cn(
              'relative cursor-pointer hover:bg-ink/10 focus-visible:z-10 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-press',
              selected && OVERLAY_SELECTED,
              swapTarget === key &&
                  'z-10 outline-4 -outline-offset-4 outline-press outline-dashed',
              swapFrom === key && 'bg-paper/50',
              blocked && 'cursor-not-allowed bg-paper/60',
              drag !== null &&
                  (drag.from === key
                      ? 'bg-paper/50'
                      : canSwapKeys(drag.from, key)
                        ? 'z-10 outline-4 -outline-offset-4 outline-press outline-dashed'
                        : 'cursor-not-allowed bg-ink/40'),
              drag?.over === key &&
                  drag.over !== drag.from &&
                  !canSwapKeys(drag.from, key) &&
                  'outline-4 -outline-offset-4 outline-press outline-solid',
          )
        : cn(
              'relative flex cursor-pointer items-center justify-center text-[10px] leading-none focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-offset-1',
              selected && 'z-10 bg-card outline-3 outline-ink',
              swapTarget === key &&
                  'z-10 outline-3 outline-press outline-dashed',
              swapFrom === key && 'opacity-60',
              blocked && 'cursor-not-allowed',
              drag !== null &&
                  (drag.from === key
                      ? 'opacity-60'
                      : canSwapKeys(drag.from, key)
                        ? 'z-10 outline-3 outline-press outline-dashed'
                        : 'cursor-not-allowed opacity-40'),
              drag?.over === key &&
                  drag.over !== drag.from &&
                  !canSwapKeys(drag.from, key) &&
                  'outline-3 outline-press outline-solid',
          );
};

type BoardCellProps = {
    cellKey: string;
    className: string;
    style: CSSProperties;
    children: ReactNode;
    selected: boolean;
    blocked: boolean;
    label: string;
    swapping: boolean;
    onClick: () => void;
    onChoose: () => void;
    onPress: (event: PointerEvent) => void;
};

export const BoardCell = ({
    cellKey,
    className,
    style,
    children,
    selected,
    blocked,
    label,
    swapping,
    onClick,
    onChoose,
    onPress,
}: BoardCellProps) => (
    <div
        style={style}
        role="option"
        aria-selected={selected}
        aria-disabled={blocked || undefined}
        aria-label={label}
        tabIndex={selected ? 0 : -1}
        data-key={cellKey}
        onClick={onClick}
        onPointerDown={onPress}
        onKeyDown={(event) => {
            if (swapping) {
                return;
            }
            if ((event.key === 'Enter' || event.key === ' ') && !blocked) {
                event.preventDefault();
                onChoose();
            }
        }}
        className={className}
    >
        {children}
    </div>
);

/**
 * The photo of a space as a small block in its cell (ronde 4, Mila, UX 5): clear of the colour band, cut to fill.
 */
const SpacePhoto = ({
    position,
    edition,
    photos,
}: {
    position: number;
    edition: Edition;
    photos: PhotoInfos | undefined;
}) => {
    const placement = edition.elements[spaceKey(position)]?.photo;
    const url =
        placement === undefined
            ? undefined
            : photos?.get(placement.photoId)?.url;
    if (url === undefined || placement === undefined) {
        return null;
    }
    return (
        <img
            src={url}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute max-w-none rounded-[1px] object-cover"
            style={{
                ...miniPhotoBox(position),
                filter: placement.grayscale ? 'grayscale(1)' : undefined,
            }}
            data-testid="mini-space-photo"
        />
    );
};

export const SpaceCellContent = ({
    position,
    color,
    edition,
    photos,
    overlay,
    customized,
    warned,
}: {
    position: number;
    color: string | null;
    edition: Edition;
    photos: PhotoInfos | undefined;
    overlay: boolean;
    customized: boolean;
    warned: boolean;
}) => (
    <>
        {!overlay && (
            <>
                <span
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                        background:
                            color === null
                                ? undefined
                                : bandStyle(position, color),
                    }}
                />
                <SpacePhoto
                    position={position}
                    edition={edition}
                    photos={photos}
                />
            </>
        )}
        {customized && (
            <span
                aria-hidden="true"
                className={cn(
                    'absolute rounded-full bg-ink',
                    overlay
                        ? 'right-1 bottom-1 size-2.5 ring-2 ring-paper'
                        : 'right-0.5 bottom-0.5 size-1.5',
                )}
            />
        )}
        {warned && (
            <WarningIcon
                aria-hidden="true"
                size={overlay ? 18 : 10}
                className={cn(
                    'absolute',
                    overlay ? 'top-0.5 right-0.5' : 'top-0 right-0',
                )}
            />
        )}
    </>
);

export type CellContext = {
    selected: string;
    overlay: boolean;
    edition: Edition;
    photos: PhotoInfos | undefined;
    warned: ReadonlySet<string>;
    swap: Pick<
        ReturnType<typeof useBoardSwap>,
        'swapFrom' | 'swapTarget' | 'drag' | 'consumeDrag' | 'pressCell'
    >;
    blocked: (key: string) => boolean;
    describe: (key: string) => string;
    onSelect: (key: string) => void;
};

const NavigatorCell = ({
    cellKey: key,
    className,
    style,
    children,
    context,
}: {
    cellKey: string;
    className: string;
    style: CSSProperties;
    children: ReactNode;
    context: CellContext;
}) => {
    const { selected, swap, blocked, describe, onSelect } = context;

    return (
        <BoardCell
            cellKey={key}
            className={className}
            style={style}
            selected={selected === key}
            blocked={blocked(key)}
            label={describe(key)}
            swapping={swap.swapFrom !== null}
            onClick={() => {
                if (swap.consumeDrag()) {
                    return;
                }
                if (!blocked(key)) {
                    onSelect(key);
                }
            }}
            onChoose={() => onSelect(key)}
            onPress={(event) => swap.pressCell(key, event)}
        >
            {children}
        </BoardCell>
    );
};

export const SpaceCell = ({
    space,
    context,
}: {
    space: Space;
    context: CellContext;
}) => {
    const { selected, overlay, edition, photos, warned, swap, blocked } =
        context;
    const key = spaceKey(space.position);
    const { row, col } = gridCell(space.position);

    return (
        <NavigatorCell
            cellKey={key}
            context={context}
            className={spaceCellClass(overlay, {
                key,
                selected: selected === key,
                blocked: blocked(key),
                swapFrom: swap.swapFrom,
                swapTarget: swap.swapTarget,
                drag: swap.drag,
            })}
            style={{
                gridRow: row + 1,
                gridColumn: col + 1,
                ...(selected === key || overlay
                    ? {}
                    : {
                          // A space that cannot be chosen is hatched, like paper left blank.
                          background: blocked(key)
                              ? 'repeating-linear-gradient(135deg, var(--color-table) 0 3px, var(--color-paper) 3px 7px)'
                              : space.type === 'corner'
                                ? THEMES[edition.theme].cornerBackground
                                : THEMES[edition.theme].boardBackground,
                      }),
            }}
        >
            <SpaceCellContent
                position={space.position}
                color={groupColor(space.position, edition)}
                edition={edition}
                photos={photos}
                overlay={overlay}
                customized={isCustomized(edition, key)}
                warned={warned.has(key)}
            />
        </NavigatorCell>
    );
};

const centerCellClass = (overlay: boolean, selected: boolean): string =>
    overlay
        ? cn(
              'relative cursor-pointer hover:bg-ink/5 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-press',
              selected && OVERLAY_SELECTED,
          )
        : cn(
              'relative cursor-pointer focus-visible:outline-3 focus-visible:-outline-offset-3',
              selected && 'z-10 outline-3 -outline-offset-3 outline-ink',
          );

export const CenterCell = ({ context }: { context: CellContext }) => {
    const { selected, overlay, edition, photos } = context;

    return (
        <NavigatorCell
            cellKey={BOARD_CENTER_KEY}
            context={context}
            className={centerCellClass(overlay, selected === BOARD_CENTER_KEY)}
            style={{
                gridRow: '2 / 11',
                gridColumn: '2 / 11',
                background: overlay
                    ? undefined
                    : THEMES[edition.theme].boardBackground,
            }}
        >
            {/* The real centre, as it prints: colour, photo, logo and the ribbon (ronde 4, bug 37). */}
            {overlay ? null : <MiniCenter edition={edition} photos={photos} />}
        </NavigatorCell>
    );
};
