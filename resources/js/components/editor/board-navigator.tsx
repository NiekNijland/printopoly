import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
} from 'react';

import { WarningIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { BOARD_CENTER_KEY, spaceKey } from '@/lib/edition/keys';
import type { Edition } from '@/lib/edition/types';
import {
    BOARD_ORDER,
    boardGroups,
    elementLabel,
    isCustomized,
    stepKey,
} from '@/lib/editor/catalogue';
import { canSwap, swapTargets } from '@/lib/editor/swap';
import { spaceAt, standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';
import { spaceWidth, type BoardProfile } from '@/lib/print/board';
import { STRINGS } from '@/lib/render/strings';
import { THEMES } from '@/lib/render/themes';
import { cn } from '@/lib/utils';

interface BoardNavigatorProps {
    edition: Edition;
    interfaceLanguage: Locale;
    selected: string;
    onSelect: (key: string) => void;
    /** Element keys that have a warning in Controle. */
    warned: ReadonlySet<string>;
    /** Swap what the user made of two spaces of the same kind (drag and drop, or W). */
    onSwap?: (from: string, to: string) => void;
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

function groupColor(position: number): string | null {
    const space = spaceAt(position);
    if (space.type !== 'street') {
        return null;
    }

    return (
        standardEdition.groups.find((group) => group.id === space.group)
            ?.color ?? null
    );
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
    warned,
    onSwap,
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
        onSelect(key);
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
            move(stepKey(BOARD_ORDER, selected, forward ? 1 : -1));
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
            aria-label={describe(key)}
            tabIndex={selected === key ? 0 : -1}
            data-key={key}
            onClick={() => {
                if (justDragged.current) {
                    justDragged.current = false;

                    return;
                }
                onSelect(key);
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
                if (event.key === 'Enter' || event.key === ' ') {
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
        <div className="flex w-full max-w-md flex-col gap-2">
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
                        } else if (!start.touch && moved > DRAG_DISTANCE) {
                            beginDrag(start.key);
                        }
                    }
                    if (dragging.current !== null) {
                        const under = document
                            .elementFromPoint(event.clientX, event.clientY)
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
                    gridTemplateColumns: gridTemplate(edition.boardProfile),
                    gridTemplateRows: gridTemplate(edition.boardProfile),
                }}
                className="grid aspect-square w-full max-w-md gap-px rounded-control border-2 border-ink bg-ink"
            >
                {standardEdition.spaces.map((space) => {
                    const key = spaceKey(space.position);
                    const { row, col } = gridCell(space.position);
                    const color = groupColor(space.position);

                    return cell(
                        key,
                        cn(
                            'relative flex cursor-pointer items-center justify-center text-[10px] leading-none focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-offset-1',
                            selected === key &&
                                'z-10 bg-card outline-3 outline-ink',
                            swapTarget === key &&
                                'z-10 outline-3 outline-press outline-dashed',
                            swapFrom === key && 'opacity-60',
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
                            <span
                                aria-hidden="true"
                                className="absolute inset-0"
                                style={{
                                    background:
                                        color === null
                                            ? undefined
                                            : bandStyle(space.position, color),
                                }}
                            />
                            {isCustomized(edition, key) && (
                                <span
                                    aria-hidden="true"
                                    className="absolute right-0.5 bottom-0.5 size-1.5 rounded-full bg-ink"
                                />
                            )}
                            {warned.has(key) && (
                                <WarningIcon
                                    aria-hidden="true"
                                    size={10}
                                    className="absolute top-0 right-0"
                                />
                            )}
                        </>,
                        {
                            gridRow: row + 1,
                            gridColumn: col + 1,
                            ...(selected === key
                                ? {}
                                : {
                                      background:
                                          space.type === 'corner'
                                              ? theme.cornerBackground
                                              : theme.boardBackground,
                                  }),
                        },
                    );
                })}
                {cell(
                    BOARD_CENTER_KEY,
                    cn(
                        'flex cursor-pointer items-center justify-center p-2 text-center font-display text-lg font-extrabold focus-visible:outline-3 focus-visible:-outline-offset-3',
                        selected === BOARD_CENTER_KEY && 'bg-card',
                    ),
                    <span
                        aria-hidden="true"
                        className="block max-w-[140%] -rotate-45 truncate font-display text-lg leading-none font-extrabold text-ink"
                    >
                        {edition.elements[BOARD_CENTER_KEY]?.name ??
                            edition.name}
                    </span>,
                    {
                        gridRow: '2 / 11',
                        gridColumn: '2 / 11',
                        ...(selected === BOARD_CENTER_KEY
                            ? {}
                            : { background: theme.boardBackground }),
                    },
                )}
            </div>
            {onSwap !== undefined && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Button
                        variant="secondary"
                        disabled={
                            positionOf(selected) === null ||
                            swapTargets(positionOf(selected) ?? 0).length === 0
                        }
                        onClick={startSwap}
                        aria-keyshortcuts="W"
                    >
                        {t('editor.swap_button')}
                    </Button>
                    <span className="text-xs text-ink-soft">
                        {t('editor.swap_hint')}
                    </span>
                </div>
            )}
            <p role="status" className="m-0 min-h-5 text-sm">
                {status}
            </p>
        </div>
    );
}

interface BoardListProps {
    edition: Edition;
    interfaceLanguage: Locale;
    selected: string;
    onSelect: (key: string) => void;
    warned: ReadonlySet<string>;
}

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

/** The same spaces as a list per board side, under the navigator (B93). */
export function BoardList({
    edition,
    interfaceLanguage,
    selected,
    onSelect,
    warned,
}: BoardListProps) {
    const t = useTranslation();

    return (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {boardGroups().map((group) => (
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
                        {group.keys.map((key) => (
                            <li key={key}>
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    aria-current={selected === key}
                                    onClick={() => onSelect(key)}
                                    className={cn(
                                        'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-control border-0 bg-transparent px-2 text-left text-base',
                                        selected === key
                                            ? 'bg-card font-semibold shadow-[inset_4px_0_0_var(--color-press)]'
                                            : 'hover:bg-card/60',
                                    )}
                                >
                                    <span
                                        aria-hidden="true"
                                        className="rounded-sm size-4 shrink-0 border border-line-strong"
                                        style={{
                                            background:
                                                groupColor(
                                                    Number(key.split('.')[1]),
                                                ) ?? 'transparent',
                                        }}
                                    />
                                    <span className="flex-1">
                                        {elementLabel(
                                            key,
                                            edition,
                                            interfaceLanguage,
                                        )}
                                    </span>
                                    {isCustomized(edition, key) && (
                                        <span
                                            aria-label={t('editor.customized')}
                                            className="size-2 rounded-full bg-ink"
                                        />
                                    )}
                                    {warned.has(key) && (
                                        <WarningIcon
                                            size={18}
                                            aria-label={t('editor.has_warning')}
                                        />
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </li>
            ))}
        </ul>
    );
}
