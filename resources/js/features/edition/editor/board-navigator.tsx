import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type HTMLAttributes,
    type KeyboardEvent,
    type ReactNode,
} from 'react';

import { WarningIcon } from '@/components/ui/icons';
import { matchesQuery, isNameable } from '@/features/edition/editor/name-list';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { groupColor as groupColorOf } from '@/lib/render/edition-group-names';
import { BOARD_CENTER_KEY, spaceKey } from '@/lib/render/edition-keys';
import type { Edition } from '@/lib/render/edition-types';
import {
    BOARD_ORDER,
    boardGroups,
    elementLabel,
    isCustomized,
    stepKey,
} from '@/lib/render/editor-catalogue';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { swapsPhoto } from '@/lib/render/editor-photo-swap';
import { canSwap, swapTargets } from '@/lib/render/editor-swap';
import { spaceWidth, type BoardProfile } from '@/lib/render/print-board';
import { spaceAt, standardEdition } from '@/lib/render/standard-edition';
import { STRINGS } from '@/lib/render/strings';
import { THEMES } from '@/lib/render/themes';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/game';
import { MiniCenter } from './mini-center';
import { NameRow } from './name-row';

interface BoardNavigatorProps {
    edition: Edition;
    interfaceLanguage: Locale;
    selected: string;
    /** A space was picked: a click, a tap, Enter or Space. */
    onSelect: (key: string) => void;
    /**
     * The arrow keys, Home and End walked to a space. By default the same as `onSelect`; on a phone the walk
     * only moves the choice, and Enter opens it (bug 16, ronde 3).
     */
    onMove?: (key: string) => void;
    /** Element keys that have a warning in Controle. */
    warned: ReadonlySet<string>;
    /** Swap what the user made of two spaces of the same kind (drag and drop, or W). */
    onSwap?: (from: string, to: string) => void;
    /**
     * Only the hit areas, for laying over the real board render (the big board, feedback 22 nov): the cells draw
     * nothing of their own but the choice, the focus ring, the dot for a changed space, the warning and the swap
     * outlines. The grid follows the board profile, rim included, so every cell lies on its drawn space.
     */
    overlay?: boolean;
    /**
     * Which spaces can be chosen; the others show greyed out and the arrows step over them. The friends' page uses
     * it for the spaces without a photo or a name of their own (B175). Without it every space can be chosen.
     */
    selectable?: (key: string) => boolean;
    /**
     * The photos of this browser (ronde 4, Mila): with them the board shows the photos of the spaces as small
     * blocks and the centre as it prints, with its colour, photo or logo.
     */
    photos?: PhotoInfos;
    /** With `overlay`: what lies under the hit areas, the board as it prints, in a square box. */
    board?: ReactNode;
}

/** The board position of a `space.NN` key, or null for the centre. */
function positionOf(key: string): number | null {
    return key.startsWith('space.') ? Number(key.slice(6)) : null;
}

const canSwapKeys = (a: string, b: string): boolean => {
    const first = positionOf(a);
    const second = positionOf(b);

    return first !== null && second !== null && canSwap(first, second);
};

/** A pointer that moves this far (px) with a mouse, or is held this long (ms) on touch, starts a drag. */
const DRAG_DISTANCE = 6;
const LONG_PRESS_MS = 350;

/** Row and column (0 to 10) of a position on the board. Position 0 is bottom right. */
export function gridCell(position: number): { row: number; col: number } {
    if (position <= 10) {
        return { row: 10, col: 10 - position };
    }
    if (position <= 20) {
        return { row: 10 - (position - 10), col: 0 };
    }
    if (position <= 30) {
        return { row: 0, col: position - 20 };
    }

    return { row: position - 30, col: 10 };
}

function groupColor(position: number, edition: Edition): string | null {
    const space = spaceAt(position);
    if (space.type !== 'street') {
        return null;
    }

    // The colour the group is printed in, so Riso's brown group is purple here too (bug 27).
    return groupColorOf(edition, space.group);
}

/** Which side of the board a cell is on, so the colour band sits on the inner edge, 20% deep as on the board. */
function bandStyle(position: number, color: string): string {
    const toward =
        position < 10
            ? 'to bottom'
            : position < 20
              ? 'to left'
              : position < 30
                ? 'to top'
                : 'to right';

    return `linear-gradient(${toward}, ${color} 20%, transparent 20%)`;
}

/**
 * The chosen space over the real board: a thick ink line inside the space with a paper line within it, so it
 * shows on a light and on a dark board.
 */
const OVERLAY_SELECTED =
    'z-10 outline-4 -outline-offset-4 outline-ink shadow-[inset_0_0_0_7px_var(--color-paper)]';

/**
 * The rows and columns of the navigator in the proportions of the board: a corner, nine spaces and a corner,
 * each as wide as in the profile (mm as `fr`), so spaces are narrow and deep and corners larger.
 */
export function gridTemplate(profile: BoardProfile): string {
    const space = spaceWidth(profile);

    return `${profile.corner}fr repeat(9, ${space}fr) ${profile.corner}fr`;
}

/**
 * The board as a navigator (B93, B98): one tab stop, arrows walk along the spaces in game order.
 * All 40 spaces and the centre can be chosen.
 */
export function BoardNavigator({
    edition,
    interfaceLanguage,
    selected,
    onSelect,
    onMove = onSelect,
    warned,
    onSwap,
    overlay = false,
    selectable,
    photos,
    board,
}: BoardNavigatorProps) {
    const t = useTranslation();
    const grid = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState('');
    // Keyboard swap: the space being moved and the one it would swap with.
    const [swapFrom, setSwapFrom] = useState<string | null>(null);
    const [swapTarget, setSwapTarget] = useState<string | null>(null);
    // Pointer swap: the space being dragged and the one under the pointer.
    const [drag, setDrag] = useState<{
        from: string;
        over: string | null;
    } | null>(null);
    const press = useRef<{
        key: string;
        x: number;
        y: number;
        touch: boolean;
        timer: number | undefined;
    } | null>(null);
    const dragging = useRef<string | null>(null);
    const justDragged = useRef(false);

    const label = (key: string): string =>
        elementLabel(key, edition, interfaceLanguage);

    const doSwap = (from: string, to: string): void => {
        if (onSwap === undefined || !canSwapKeys(from, to)) {
            return;
        }
        const names = { a: label(from), b: label(to) };

        onSwap(from, to);
        setStatus(t('editor.swap_done', names));
    };

    const stopDrag = (): void => {
        window.clearTimeout(press.current?.timer);
        press.current = null;
        dragging.current = null;
        setDrag(null);
    };

    const beginDrag = (key: string): void => {
        dragging.current = key;
        setDrag({ from: key, over: null });
        setStatus(t('editor.swap_dragging', { name: label(key) }));
    };

    // While a drag is on, a touch must not scroll the page.
    useEffect(() => {
        const node = grid.current;
        const block = (event: TouchEvent): void => {
            if (dragging.current !== null && event.cancelable) {
                event.preventDefault();
            }
        };

        node?.addEventListener('touchmove', block, { passive: false });

        return () => node?.removeEventListener('touchmove', block);
    }, []);

    const startSwap = (): void => {
        const position = positionOf(selected);
        const first =
            position === null
                ? undefined
                : (swapTargets(position).find((other) => other > position) ??
                  swapTargets(position)[0]);

        if (first === undefined) {
            setStatus(t('editor.swap_not_allowed'));

            return;
        }
        setSwapFrom(selected);
        setSwapTarget(spaceKey(first));
        setStatus(
            t('editor.swap_pick', { name: label(selected) }) +
                ' ' +
                t('editor.swap_target', { name: label(spaceKey(first)) }),
        );
    };

    const cancelSwap = (message: boolean): void => {
        setSwapFrom(null);
        setSwapTarget(null);
        if (message) {
            setStatus(t('editor.swap_cancelled'));
        }
    };

    /** Keys of the keyboard swap: arrows pick the target among spaces of the same kind. */
    const onSwapKey = (event: KeyboardEvent): boolean => {
        if (swapFrom === null || swapTarget === null) {
            return false;
        }
        const from = positionOf(swapFrom);
        const options = from === null ? [] : swapTargets(from).map(spaceKey);
        const at = options.indexOf(swapTarget);

        if (event.key === 'Escape') {
            cancelSwap(true);
        } else if (event.key === 'Enter' || event.key === ' ') {
            doSwap(swapFrom, swapTarget);
            cancelSwap(false);
        } else if (event.key.startsWith('Arrow')) {
            const forward =
                event.key === 'ArrowRight' || event.key === 'ArrowDown';
            const next =
                options[
                    (at + (forward ? 1 : -1) + options.length) % options.length
                ];

            if (next !== undefined) {
                setSwapTarget(next);
                setStatus(t('editor.swap_target', { name: label(next) }));
            }
        } else if (event.key !== 'Tab') {
            return true;
        } else {
            cancelSwap(false);

            return false;
        }
        event.preventDefault();
        event.stopPropagation();

        return true;
    };

    const move = (key: string | undefined): void => {
        if (key === undefined) {
            return;
        }
        onMove(key);
        requestAnimationFrame(() =>
            grid.current
                ?.querySelector<HTMLElement>(`[data-key="${key}"]`)
                ?.focus(),
        );
    };

    const onKeyDown = (event: KeyboardEvent): void => {
        if (onSwapKey(event)) {
            return;
        }
        if (
            (event.key === 'w' || event.key === 'W') &&
            onSwap !== undefined &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
        ) {
            event.preventDefault();
            startSwap();

            return;
        }
        const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
        const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
        if (forward || back) {
            event.preventDefault();
            let next = stepKey(BOARD_ORDER, selected, forward ? 1 : -1);
            for (
                let guard = 0;
                next !== undefined &&
                selectable !== undefined &&
                !selectable(next) &&
                guard < BOARD_ORDER.length;
                guard++
            ) {
                next = stepKey(BOARD_ORDER, next, forward ? 1 : -1);
            }
            move(next);
        } else if (event.key === 'Home') {
            event.preventDefault();
            move(BOARD_ORDER[0]);
        } else if (event.key === 'End') {
            event.preventDefault();
            move(BOARD_ORDER[BOARD_ORDER.length - 1]);
        }
    };

    const theme = THEMES[edition.theme];

    const describe = (key: string): string => {
        const parts = [elementLabel(key, edition, interfaceLanguage)];
        if (isCustomized(edition, key)) {
            parts.push(t('editor.customized'));
        }
        if (warned.has(key)) {
            parts.push(t('editor.has_warning'));
        }

        return parts.join(', ');
    };

    const blocked = (key: string): boolean =>
        selectable !== undefined && !selectable(key);

    const cell = (
        key: string,
        className: string,
        content: ReactNode,
        style: CSSProperties,
    ) => (
        <div
            key={key}
            style={style}
            role="option"
            aria-selected={selected === key}
            aria-disabled={blocked(key) || undefined}
            aria-label={describe(key)}
            tabIndex={selected === key ? 0 : -1}
            data-key={key}
            onClick={() => {
                if (justDragged.current) {
                    justDragged.current = false;

                    return;
                }
                if (!blocked(key)) {
                    onSelect(key);
                }
            }}
            onPointerDown={(event) => {
                const position = positionOf(key);

                if (
                    onSwap === undefined ||
                    position === null ||
                    swapTargets(position).length === 0 ||
                    (event.pointerType === 'mouse' && event.button !== 0)
                ) {
                    return;
                }
                const touch = event.pointerType !== 'mouse';

                press.current = {
                    key,
                    x: event.clientX,
                    y: event.clientY,
                    touch,
                    timer: touch
                        ? window.setTimeout(() => beginDrag(key), LONG_PRESS_MS)
                        : undefined,
                };
            }}
            onKeyDown={(event) => {
                if (swapFrom !== null) {
                    return;
                }
                if (
                    (event.key === 'Enter' || event.key === ' ') &&
                    !blocked(key)
                ) {
                    event.preventDefault();
                    onSelect(key);
                }
            }}
            className={className}
        >
            {content}
        </div>
    );

    return (
        <div
            className={cn(
                'flex w-full flex-col gap-2',
                !overlay && 'max-w-md md:max-w-xl lg:max-w-md',
            )}
        >
            <div className="rounded-control" data-board-scroll data-keep-colors>
                <div className={cn(overlay && 'relative')}>
                    {overlay && board}
                    <div
                        ref={grid}
                        role="listbox"
                        tabIndex={-1}
                        aria-label={t('editor.board_navigator')}
                        onKeyDown={onKeyDown}
                        onPointerMove={(event) => {
                            const start = press.current;

                            if (start !== null && dragging.current === null) {
                                const moved = Math.hypot(
                                    event.clientX - start.x,
                                    event.clientY - start.y,
                                );

                                if (start.touch && moved > DRAG_DISTANCE * 2) {
                                    // The finger moved before the long press: it is a scroll, not a drag.
                                    stopDrag();
                                } else if (
                                    !start.touch &&
                                    moved > DRAG_DISTANCE
                                ) {
                                    beginDrag(start.key);
                                }
                            }
                            if (dragging.current !== null) {
                                const under = document
                                    .elementFromPoint(
                                        event.clientX,
                                        event.clientY,
                                    )
                                    ?.closest<HTMLElement>('[data-key]');
                                const over = under?.dataset.key ?? null;

                                setDrag({ from: dragging.current, over });
                            }
                        }}
                        onPointerUp={() => {
                            const from = dragging.current;
                            const over = drag?.over ?? null;

                            if (from !== null) {
                                justDragged.current = true;
                                if (over !== null && over !== from) {
                                    if (canSwapKeys(from, over)) {
                                        doSwap(from, over);
                                    } else {
                                        setStatus(t('editor.swap_not_allowed'));
                                    }
                                }
                            }
                            stopDrag();
                        }}
                        onPointerCancel={stopDrag}
                        style={{
                            gridTemplateColumns: gridTemplate(
                                edition.boardProfile,
                            ),
                            gridTemplateRows: gridTemplate(
                                edition.boardProfile,
                            ),
                            // The rim of the board (border in the profile) lies outside the spaces.
                            ...(overlay
                                ? {
                                      padding: `${String((edition.boardProfile.border / edition.boardProfile.outer) * 100)}%`,
                                  }
                                : {}),
                        }}
                        className={cn(
                            'grid aspect-square w-full',
                            overlay && 'relative',
                            !overlay &&
                                'gap-px rounded-control border-2 border-ink bg-ink',
                        )}
                    >
                        {standardEdition.spaces.map((space) => {
                            const key = spaceKey(space.position);
                            const { row, col } = gridCell(space.position);
                            const color = groupColor(space.position, edition);

                            return cell(
                                key,
                                overlay
                                    ? cn(
                                          'relative cursor-pointer hover:bg-ink/10 focus-visible:z-10 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-press',
                                          selected === key && OVERLAY_SELECTED,
                                          swapTarget === key &&
                                              'z-10 outline-4 -outline-offset-4 outline-press outline-dashed',
                                          swapFrom === key && 'bg-paper/50',
                                          blocked(key) &&
                                              'cursor-not-allowed bg-paper/60',
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
                                          selected === key &&
                                              'z-10 bg-card outline-3 outline-ink',
                                          swapTarget === key &&
                                              'z-10 outline-3 outline-press outline-dashed',
                                          swapFrom === key && 'opacity-60',
                                          blocked(key) && 'cursor-not-allowed',
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
                                      ),
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
                                                            : bandStyle(
                                                                  space.position,
                                                                  color,
                                                              ),
                                                }}
                                            />
                                            <SpacePhoto
                                                position={space.position}
                                                edition={edition}
                                                photos={photos}
                                            />
                                        </>
                                    )}
                                    {isCustomized(edition, key) && (
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
                                    {warned.has(key) && (
                                        <WarningIcon
                                            aria-hidden="true"
                                            size={overlay ? 18 : 10}
                                            className={cn(
                                                'absolute',
                                                overlay
                                                    ? 'top-0.5 right-0.5'
                                                    : 'top-0 right-0',
                                            )}
                                        />
                                    )}
                                </>,
                                {
                                    gridRow: row + 1,
                                    gridColumn: col + 1,
                                    ...(selected === key || overlay
                                        ? {}
                                        : {
                                              // A space that cannot be chosen is hatched, like paper left blank.
                                              background: blocked(key)
                                                  ? 'repeating-linear-gradient(135deg, var(--color-table) 0 3px, var(--color-paper) 3px 7px)'
                                                  : space.type === 'corner'
                                                    ? theme.cornerBackground
                                                    : theme.boardBackground,
                                          }),
                                },
                            );
                        })}
                        {cell(
                            BOARD_CENTER_KEY,
                            overlay
                                ? cn(
                                      'relative cursor-pointer hover:bg-ink/5 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-press',
                                      selected === BOARD_CENTER_KEY &&
                                          OVERLAY_SELECTED,
                                  )
                                : cn(
                                      'relative cursor-pointer focus-visible:outline-3 focus-visible:-outline-offset-3',
                                      selected === BOARD_CENTER_KEY &&
                                          'z-10 outline-3 -outline-offset-3 outline-ink',
                                  ),
                            // The real centre, as it prints: colour, photo, logo and the ribbon (ronde 4, bug 37).
                            overlay ? null : (
                                <MiniCenter edition={edition} photos={photos} />
                            ),
                            {
                                gridRow: '2 / 11',
                                gridColumn: '2 / 11',
                                background: overlay
                                    ? undefined
                                    : theme.boardBackground,
                            },
                        )}
                    </div>
                </div>
            </div>
            <p role="status" className="m-0 min-h-5 text-sm empty:sr-only">
                {status}
            </p>
        </div>
    );
}

/**
 * Where the photo of a space sits in its cell of the mini board, as a share of the cell: clear of the colour band on
 * the inner edge. The size is set on both axes (R5-06): an image with only its edges set keeps its own width, so a
 * photo on a side row ran over the next spaces and off the board.
 */
function miniPhotoBox(position: number): {
    left: string;
    top: string;
    width: string;
    height: string;
} {
    const box = (left: number, top: number, width: number, height: number) => ({
        left: `${String(left)}%`,
        top: `${String(top)}%`,
        width: `${String(width)}%`,
        height: `${String(height)}%`,
    });

    if (position % 10 === 0) {
        return box(12, 12, 76, 76);
    }
    if (position < 10) {
        // Bottom row: the band is on top.
        return box(8, 26, 84, 66);
    }
    if (position < 20) {
        // Left column: the band is on the right.
        return box(8, 8, 66, 84);
    }
    if (position < 30) {
        // Top row: the band is at the bottom.
        return box(8, 8, 84, 66);
    }

    // Right column: the band is on the left.
    return box(26, 8, 66, 84);
}

/**
 * The photo of a space as a small block in its cell (ronde 4, Mila, UX 5): clear of the colour band, cut to fill.
 */
function SpacePhoto({
    position,
    edition,
    photos,
}: {
    position: number;
    edition: Edition;
    photos: PhotoInfos | undefined;
}) {
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
}

interface BoardListProps {
    edition: Edition;
    interfaceLanguage: Locale;
    selected: string;
    /** Opens a space: the swatch of a row, or a row without a name of its own. */
    onSelect: (key: string) => void;
    /** Typing in a row shows that space, without leaving the list (B161). */
    onFocusRow?: (key: string) => void;
    warned: ReadonlySet<string>;
    session: EditionSession;
    /** The search above the list: only spaces whose name holds it (B161). */
    query?: string;
    onAnnounce?: (text: string) => void;
    /** The photos of this browser: a space with a photo shows it small in its row (B238). */
    photos?: PhotoInfos;
    /** A photo dragged from one row to another: the two spaces trade photos, or it moves (B238). */
    onSwapPhoto?: (from: string, to: string) => void;
}

/** The type of a photo dragged between rows of the list, so a drop of files is not mistaken for it. */
const PHOTO_DRAG = 'application/x-printopoly-photo';

/** Name of a corner for the side headings: "Start", "Op bezoek", "Vrij parkeren". */
function cornerName(
    position: number,
    edition: Edition,
    interfaceLanguage: Locale,
): string {
    if (position === 10) {
        return STRINGS[interfaceLanguage].justVisiting;
    }

    return elementLabel(
        spaceKey(position),
        { ...edition, elements: {} },
        interfaceLanguage,
    );
}

/**
 * The same spaces as a list per board side, under the navigator (B93). Every space with a name of its own has
 * it as a field in its row (B161); a search narrows the list down.
 */
export function BoardList({
    edition,
    interfaceLanguage,
    selected,
    onSelect,
    onFocusRow = onSelect,
    warned,
    session,
    query = '',
    onAnnounce = () => undefined,
    photos,
    onSwapPhoto,
}: BoardListProps) {
    const t = useTranslation();
    // A photo dragged between rows (B238): where it comes from and the row it hovers over.
    const [photoDrag, setPhotoDrag] = useState<{
        from: string;
        over: string | null;
    } | null>(null);
    const label = (key: string): string =>
        elementLabel(key, edition, interfaceLanguage);

    /** The small photo at the end of a row; with a mouse it can be dragged to another row. */
    const rowPhoto = (key: string): ReactNode => {
        const placement = edition.elements[key]?.photo;
        const url =
            placement === undefined
                ? undefined
                : photos?.get(placement.photoId)?.url;
        if (url === undefined || !swapsPhoto(key)) {
            return null;
        }
        const draggable = onSwapPhoto !== undefined;

        return (
            <span
                role="img"
                aria-label={t(
                    draggable
                        ? 'editor.photo_drag_label'
                        : 'editor.layer_photo',
                    { name: label(key) },
                )}
                title={
                    draggable
                        ? t('editor.photo_drag_label', { name: label(key) })
                        : undefined
                }
                draggable={draggable}
                data-row-photo={key}
                onDragStart={(event) => {
                    event.dataTransfer.setData(PHOTO_DRAG, key);
                    event.dataTransfer.effectAllowed = 'move';
                    setPhotoDrag({ from: key, over: null });
                    onAnnounce(
                        t('editor.photo_dragging', { name: label(key) }),
                    );
                }}
                onDragEnd={() => setPhotoDrag(null)}
                className={cn(
                    'size-8 flex-none overflow-hidden rounded-control border border-line-strong bg-table',
                    draggable && 'cursor-grab active:cursor-grabbing',
                    photoDrag?.from === key && 'opacity-40',
                )}
            >
                <img
                    src={url}
                    alt=""
                    draggable={false}
                    className="pointer-events-none size-full object-cover"
                    style={{
                        filter: placement?.grayscale
                            ? 'grayscale(1)'
                            : undefined,
                    }}
                />
            </span>
        );
    };

    /** A row a dragged photo can land on: another street, station or utility. */
    const photoDrop = (
        key: string,
    ): HTMLAttributes<HTMLDivElement> | undefined =>
        onSwapPhoto === undefined || !swapsPhoto(key)
            ? undefined
            : {
                  onDragOver: (event) => {
                      if (
                          photoDrag === null ||
                          photoDrag.from === key ||
                          !event.dataTransfer.types.includes(PHOTO_DRAG)
                      ) {
                          return;
                      }
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      if (photoDrag.over !== key) {
                          setPhotoDrag({ ...photoDrag, over: key });
                      }
                  },
                  onDragLeave: () =>
                      setPhotoDrag((current) =>
                          current?.over === key
                              ? { ...current, over: null }
                              : current,
                      ),
                  onDrop: (event) => {
                      const from = event.dataTransfer.getData(PHOTO_DRAG);
                      if (from === '' || from === key) {
                          return;
                      }
                      event.preventDefault();
                      event.stopPropagation();
                      setPhotoDrag(null);
                      onSwapPhoto(from, key);
                  },
              };
    const groups = boardGroups()
        .map((group) => ({
            ...group,
            keys: group.keys.filter((key) =>
                matchesQuery(
                    query,
                    elementLabel(key, edition, interfaceLanguage),
                ),
            ),
        }))
        .filter((group) => group.keys.length > 0);
    const showCenter = matchesQuery(
        query,
        elementLabel(BOARD_CENTER_KEY, edition, interfaceLanguage),
    );

    if (groups.length === 0 && !showCenter) {
        return (
            <p role="status" className="m-0 px-2 py-3 text-base text-ink-soft">
                {t('editor.search_none', { query: query.trim() })}
            </p>
        );
    }

    return (
        <ul data-name-list className="m-0 flex list-none flex-col gap-1 p-0">
            {/* The centre is part of the board, so the list names it too: name, photo or logo (UX 9). */}
            {showCenter && (
                <li>
                    <button
                        type="button"
                        tabIndex={-1}
                        aria-current={selected === BOARD_CENTER_KEY}
                        onClick={() => onSelect(BOARD_CENTER_KEY)}
                        className={cn(
                            'flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-control border-2 border-dashed border-line-strong bg-board/60 px-2 text-left text-base',
                            selected === BOARD_CENTER_KEY
                                ? 'border-solid border-ink bg-card font-semibold shadow-[inset_4px_0_0_var(--color-press)]'
                                : 'hover:bg-board',
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className="rounded-sm grid size-4 shrink-0 place-items-center border border-line-strong bg-board-deep"
                        >
                            <span className="size-1.5 rounded-full bg-ink" />
                        </span>
                        <span className="flex-1">
                            {elementLabel(
                                BOARD_CENTER_KEY,
                                edition,
                                interfaceLanguage,
                            )}
                            <span className="block text-sm font-normal text-ink-soft">
                                {t('editor.center_row_hint')}
                            </span>
                        </span>
                        {isCustomized(edition, BOARD_CENTER_KEY) && (
                            <span
                                aria-label={t('editor.customized')}
                                className="size-2 rounded-full bg-ink"
                            />
                        )}
                        {warned.has(BOARD_CENTER_KEY) && (
                            <WarningIcon
                                size={18}
                                aria-label={t('editor.has_warning')}
                            />
                        )}
                    </button>
                </li>
            )}
            {groups.map((group) => (
                <li key={group.from} className="flex flex-col">
                    <span className="px-2 py-1 text-sm font-semibold text-ink-soft">
                        {t('editor.side', {
                            from: cornerName(
                                group.from,
                                edition,
                                interfaceLanguage,
                            ),
                            to: cornerName(
                                group.to,
                                edition,
                                interfaceLanguage,
                            ),
                        })}
                    </span>
                    <ul className="m-0 flex list-none flex-col p-0">
                        {group.keys.map((key) => {
                            const swatch = (
                                <span
                                    aria-hidden="true"
                                    className="rounded-sm size-4 shrink-0 border border-line-strong"
                                    style={{
                                        background:
                                            groupColor(
                                                Number(key.split('.')[1]),
                                                edition,
                                            ) ?? 'transparent',
                                    }}
                                />
                            );

                            return isNameable(key) ? (
                                <NameRow
                                    key={key}
                                    elementKey={key}
                                    edition={edition}
                                    interfaceLanguage={interfaceLanguage}
                                    session={session}
                                    selected={selected === key}
                                    warned={warned.has(key)}
                                    leading={swatch}
                                    onOpen={onSelect}
                                    onFocusRow={onFocusRow}
                                    onAnnounce={onAnnounce}
                                    trailing={rowPhoto(key)}
                                    drop={photoDrop(key)}
                                    dropping={photoDrag?.over === key}
                                />
                            ) : (
                                <li key={key}>
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        aria-current={selected === key}
                                        data-row-open={key}
                                        onClick={() => onSelect(key)}
                                        className={cn(
                                            'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-control border-0 bg-transparent pr-2 pl-3 text-left text-base',
                                            selected === key
                                                ? 'bg-card font-semibold shadow-[inset_4px_0_0_var(--color-press)]'
                                                : 'hover:bg-card/60',
                                        )}
                                    >
                                        {swatch}
                                        <span className="flex-1 pl-3.5">
                                            {elementLabel(
                                                key,
                                                edition,
                                                interfaceLanguage,
                                            )}
                                        </span>
                                        {isCustomized(edition, key) && (
                                            <span
                                                aria-label={t(
                                                    'editor.customized',
                                                )}
                                                className="size-2 rounded-full bg-ink"
                                            />
                                        )}
                                        {warned.has(key) && (
                                            <WarningIcon
                                                size={18}
                                                aria-label={t(
                                                    'editor.has_warning',
                                                )}
                                            />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </li>
            ))}
        </ul>
    );
}
