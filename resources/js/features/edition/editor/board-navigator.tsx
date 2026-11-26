import {
    useRef,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
} from 'react';

import {
    CenterCell,
    SpaceCell,
    type CellContext,
} from '@/features/edition/editor/board-cell';
import { gridTemplate, walkKey } from '@/features/edition/editor/board-grid';
import { useBoardSwap } from '@/features/edition/editor/use-board-swap';
import { useTranslation } from '@/hooks/use-translation';
import type { Edition } from '@/lib/render/edition-types';
import {
    BOARD_ORDER,
    elementLabel,
    isCustomized,
} from '@/lib/render/editor-catalogue';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { standardEdition } from '@/lib/render/standard-edition';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/game';

type BoardNavigatorProps = {
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
};

type BoardKeys = {
    selected: string;
    selectable: ((key: string) => boolean) | undefined;
    canSwap: boolean;
    move: (key: string | undefined) => void;
    startSwap: () => void;
    onSwapKey: (event: KeyboardEvent) => boolean;
};

const onBoardKey = (event: KeyboardEvent, keys: BoardKeys): void => {
    const { selected, selectable, canSwap, move, startSwap, onSwapKey } = keys;
    if (onSwapKey(event)) {
        return;
    }
    if (
        (event.key === 'w' || event.key === 'W') &&
        canSwap &&
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
        move(walkKey(selected, forward, selectable));
    } else if (event.key === 'Home') {
        event.preventDefault();
        move(BOARD_ORDER[0]);
    } else if (event.key === 'End') {
        event.preventDefault();
        move(BOARD_ORDER[BOARD_ORDER.length - 1]);
    }
};

const gridStyle = (edition: Edition, overlay: boolean): CSSProperties => ({
    gridTemplateColumns: gridTemplate(edition.boardProfile),
    gridTemplateRows: gridTemplate(edition.boardProfile),
    // The rim of the board (border in the profile) lies outside the spaces.
    ...(overlay
        ? {
              padding: `${String((edition.boardProfile.border / edition.boardProfile.outer) * 100)}%`,
          }
        : {}),
});

const describeKey = (
    key: string,
    edition: Edition,
    interfaceLanguage: Locale,
    warned: ReadonlySet<string>,
    t: ReturnType<typeof useTranslation>,
): string => {
    const parts = [elementLabel(key, edition, interfaceLanguage)];
    if (isCustomized(edition, key)) {
        parts.push(t('editor.customized'));
    }
    if (warned.has(key)) {
        parts.push(t('editor.has_warning'));
    }

    return parts.join(', ');
};

const gridClass = (overlay: boolean): string =>
    cn(
        'grid aspect-square w-full',
        overlay && 'relative',
        !overlay && 'gap-px rounded-control border-2 border-ink bg-ink',
    );

const BoardFrame = ({
    overlay,
    board,
    status,
    children,
}: {
    overlay: boolean;
    board: ReactNode;
    status: string;
    children: ReactNode;
}) => (
    <div
        className={cn(
            'flex w-full flex-col gap-2',
            !overlay && 'max-w-md md:max-w-xl lg:max-w-md',
        )}
    >
        <div className="rounded-control" data-board-scroll data-keep-colors>
            <div className={cn(overlay && 'relative')}>
                {overlay && board}
                {children}
            </div>
        </div>
        <p role="status" className="m-0 min-h-5 text-sm empty:sr-only">
            {status}
        </p>
    </div>
);

/**
 * The board as a navigator (B93, B98): one tab stop, arrows walk along the spaces in game order.
 * All 40 spaces and the centre can be chosen.
 */
export const BoardNavigator = ({
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
}: BoardNavigatorProps) => {
    const t = useTranslation();
    const grid = useRef<HTMLDivElement>(null);
    const label = (key: string): string =>
        elementLabel(key, edition, interfaceLanguage);
    const swap = useBoardSwap({ grid, selected, label, onSwap });

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

    const context: CellContext = {
        selected,
        overlay,
        edition,
        photos,
        warned,
        swap,
        blocked: (key) => selectable !== undefined && !selectable(key),
        describe: (key) =>
            describeKey(key, edition, interfaceLanguage, warned, t),
        onSelect,
    };

    return (
        <BoardFrame overlay={overlay} board={board} status={swap.status}>
            <div
                ref={grid}
                role="listbox"
                tabIndex={-1}
                aria-label={t('editor.board_navigator')}
                onKeyDown={(event) =>
                    onBoardKey(event, {
                        selected,
                        selectable,
                        canSwap: onSwap !== undefined,
                        move,
                        startSwap: swap.startSwap,
                        onSwapKey: swap.onSwapKey,
                    })
                }
                onPointerMove={swap.onPointerMove}
                onPointerUp={swap.onPointerUp}
                onPointerCancel={swap.stopDrag}
                style={gridStyle(edition, overlay)}
                className={gridClass(overlay)}
            >
                {standardEdition.spaces.map((space) => (
                    <SpaceCell
                        key={space.position}
                        space={space}
                        context={context}
                    />
                ))}
                <CenterCell context={context} />
            </div>
        </BoardFrame>
    );
};
