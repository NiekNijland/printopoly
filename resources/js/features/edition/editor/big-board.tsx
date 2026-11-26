import { useEffect, useMemo, useRef, useState } from 'react';

import { Board, boardPropsOf } from '@/components/render';
import { NO_PHOTOS } from '@/components/render/board-props';
import { editorSources } from '@/components/render/editor-element-preview';
import { Scaled } from '@/components/render/table-scaled';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { BoardNavigator } from '@/features/edition/editor/board-navigator';
import { useKeyboardHints } from '@/hooks/use-media-query';
import { useTranslation } from '@/hooks/use-translation';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import type { Locale } from '@/types/game';

type BigBoardProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    edition: Edition;
    interfaceLanguage: Locale;
    /** The space that is open in the editor now. */
    selected: string;
    warned: ReadonlySet<string>;
    /** A space was picked: open it and close the big board. */
    onPick: (key: string) => void;
    onSwap?: (from: string, to: string) => void;
    /** The photos of this browser, for the photos on the spaces and the centre. */
    photos?: PhotoInfos;
};

/**
 * The board exactly as it prints (feedback 22 nov): the same renderer as the Voorbeeld, the thumbnail and the PDF,
 * scaled to the width of its square box. It measures that box, so it follows the dialog and larger text.
 */
const PrintedBoard = ({
    edition,
    photos,
}: {
    edition: Edition;
    photos: PhotoInfos | undefined;
}) => {
    const box = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const resolved = useMemo(() => resolveEdition(edition), [edition]);

    useEffect(() => {
        const node = box.current;
        if (node === null) {
            return;
        }
        const measure = (): void => setWidth(node.clientWidth);
        measure();
        if (typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver(measure);
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={box}
            aria-hidden="true"
            data-big-board-render
            // A ring, not a border: the hit areas lie over the box edge to edge and must not shift.
            className="absolute inset-x-0 top-0 aspect-square overflow-hidden rounded-control bg-board ring-2 ring-ink"
        >
            {/* Hidden until the box is measured, so it never flashes at full size. */}
            <Scaled
                widthMm={edition.boardProfile.outer}
                heightMm={edition.boardProfile.outer}
                width={width}
                style={{ visibility: width > 0 ? undefined : 'hidden' }}
            >
                <Board
                    {...boardPropsOf(
                        resolved,
                        photos === undefined
                            ? NO_PHOTOS
                            : editorSources(photos),
                    )}
                />
            </Scaled>
        </div>
    );
};

/**
 * "Bord vergroten" (bug 11 and UX 2, ronde 3): the whole board as it prints (feedback 22 nov), with a hit area over
 * every space and the centre, big enough for a finger (at least 44 px per space). On a phone it is larger than the
 * screen and scrolls; it opens at the space that is chosen now. The arrow keys walk, Enter or a tap opens the space.
 */
export const BigBoard = ({
    open,
    onOpenChange,
    edition,
    interfaceLanguage,
    selected,
    warned,
    onPick,
    onSwap,
    photos,
}: BigBoardProps) => {
    const t = useTranslation();
    const keys = useKeyboardHints();
    const [walk, setWalk] = useState<{ from: string; key: string } | null>(
        null,
    );
    // The walk starts at the space that is open; a new open starts over.
    const current =
        walk !== null && walk.from === selected ? walk.key : selected;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setWalk(null);
                onOpenChange(next);
            }}
        >
            <DialogContent
                className="flex h-[calc(100dvh-16px)] max-h-none w-[calc(100vw-16px)] max-w-[min(calc(100vw-16px),70rem)] flex-col gap-3 overflow-hidden p-3 min-[480px]:max-h-none min-[480px]:p-4 [&>button:first-child]:hidden"
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    const cell = (
                        event.currentTarget as HTMLElement
                    ).querySelector<HTMLElement>(`[data-key="${selected}"]`);
                    cell?.focus({ preventScroll: true });
                    cell?.scrollIntoView({ block: 'center', inline: 'center' });
                }}
            >
                <div className="flex flex-col gap-1">
                    <DialogTitle className="text-xl min-[480px]:text-2xl">
                        {t('editor.big_board_title')}
                    </DialogTitle>
                    <DialogDescription className="mt-0 text-sm">
                        {t('editor.big_board_hint')}{' '}
                        {/* The arrow keys only for someone with a keyboard (Gerda, Emma: R5-18). */}
                        {keys && `${t('editor.big_board_keys')} `}
                        {/* Only a phone scrolls the big board (B166); a tablet fits it (bug 16). */}
                        <span className="font-semibold md:hidden">
                            {t('editor.big_board_scroll')}
                        </span>
                    </DialogDescription>
                </div>
                <div
                    data-big-board
                    className="[container-type:size] min-h-0 flex-1 overflow-auto overscroll-contain rounded-control bg-table p-2"
                >
                    {/* The board fits the window from a tablet up, also with larger text; a phone keeps spaces of
                        at least 44 px and scrolls (B166, bug 16). */}
                    <div
                        data-big-board-size
                        className="mx-auto w-[max(40rem,min(100cqw,100cqh))] md:w-[min(100cqw,100cqh)]"
                    >
                        <BoardNavigator
                            overlay
                            board={
                                <PrintedBoard
                                    edition={edition}
                                    photos={photos}
                                />
                            }
                            edition={edition}
                            interfaceLanguage={interfaceLanguage}
                            selected={current}
                            warned={warned}
                            onMove={(key) => setWalk({ from: selected, key })}
                            onSelect={onPick}
                            onSwap={onSwap}
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <DialogClose asChild>
                        <Button variant="secondary">
                            {t('editor.board_smaller')}
                        </Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
};
