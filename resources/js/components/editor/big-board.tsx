import { useState } from 'react';

import { BoardNavigator } from '@/components/editor/board-navigator';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';
import type { Edition } from '@/lib/edition/types';
import type { Locale } from '@/lib/game/types';

interface BigBoardProps {
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
}

/**
 * "Bord vergroten" (bug 11 and UX 2, ronde 3): the whole board, big enough to read every name and to hit a
 * space with a finger (at least 44 px per space). On a phone it is larger than the screen and scrolls; it opens
 * at the space that is chosen now. The arrow keys walk, Enter or a tap opens the space.
 */
export function BigBoard({
    open,
    onOpenChange,
    edition,
    interfaceLanguage,
    selected,
    warned,
    onPick,
    onSwap,
}: BigBoardProps) {
    const t = useTranslation();
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
                        {/* Only a phone scrolls the big board (B166); a tablet fits it (bug 16). */}
                        <span className="font-semibold md:hidden">
                            {t('editor.big_board_scroll')}
                        </span>
                    </DialogDescription>
                </div>
                <div
                    data-big-board
                    className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-control bg-table p-2 [container-type:size]"
                >
                    {/* The board fits the window from a tablet up, also with larger text; a phone keeps spaces of
                        at least 44 px and scrolls (B166, bug 16). */}
                    <div
                        data-big-board-size
                        className="mx-auto w-[max(40rem,min(100cqw,100cqh))] md:w-[min(100cqw,100cqh)]"
                    >
                        <BoardNavigator
                            names
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
}
