import {
    useRef,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
} from 'react';

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
import { spaceAt, standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';
import { cn } from '@/lib/utils';

interface BoardNavigatorProps {
    edition: Edition;
    interfaceLanguage: Locale;
    selected: string;
    onSelect: (key: string) => void;
    /** Element keys that have a warning in Controle. */
    warned: ReadonlySet<string>;
}

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

/** Which side of the board a cell is on, so the colour band sits on the inner edge. */
function bandStyle(position: number, color: string): string {
    const edge = 6;
    if (position < 10) {
        return `inset 0 ${edge}px 0 ${color}`;
    }
    if (position < 20) {
        return `inset -${edge}px 0 0 ${color}`;
    }
    if (position < 30) {
        return `inset 0 -${edge}px 0 ${color}`;
    }

    return `inset ${edge}px 0 0 ${color}`;
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
}: BoardNavigatorProps) {
    const t = useTranslation();
    const grid = useRef<HTMLDivElement>(null);

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
            onClick={() => onSelect(key)}
            onKeyDown={(event) => {
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
        <div
            ref={grid}
            role="listbox"
            tabIndex={-1}
            aria-label={t('editor.board_navigator')}
            onKeyDown={onKeyDown}
            className="grid aspect-square w-full max-w-md grid-cols-[repeat(11,1fr)] grid-rows-[repeat(11,1fr)] gap-px rounded-control border-2 border-ink bg-ink"
        >
            {standardEdition.spaces.map((space) => {
                const key = spaceKey(space.position);
                const { row, col } = gridCell(space.position);
                const color = groupColor(space.position);

                return cell(
                    key,
                    cn(
                        'relative flex cursor-pointer items-center justify-center bg-board text-[10px] leading-none focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-offset-1',
                        space.type === 'corner' && 'bg-board-deep',
                        selected === key &&
                            'z-10 bg-card outline-3 outline-ink',
                    ),
                    <>
                        <span
                            aria-hidden="true"
                            className="absolute inset-0"
                            style={{
                                boxShadow:
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
                            <span
                                aria-hidden="true"
                                className="font-bold absolute top-0 right-0.5 text-xs"
                            >
                                !
                            </span>
                        )}
                    </>,
                    { gridRow: row + 1, gridColumn: col + 1 },
                );
            })}
            {cell(
                BOARD_CENTER_KEY,
                cn(
                    'flex cursor-pointer items-center justify-center bg-board p-2 text-center font-display text-lg font-extrabold focus-visible:outline-3 focus-visible:-outline-offset-3',
                    selected === BOARD_CENTER_KEY && 'bg-card',
                ),
                t('editor.center'),
                { gridRow: '2 / 11', gridColumn: '2 / 11' },
            )}
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
                    <span className="px-2 py-1 text-xs font-semibold text-ink-soft uppercase">
                        {t('editor.side', {
                            from: elementLabel(
                                spaceKey(group.from),
                                { ...edition, elements: {} },
                                interfaceLanguage,
                            ),
                            to: elementLabel(
                                spaceKey(group.to),
                                { ...edition, elements: {} },
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
                                        selected === key &&
                                            'bg-card font-semibold',
                                    )}
                                >
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
                                        <span
                                            aria-label={t('editor.has_warning')}
                                        >
                                            !
                                        </span>
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
