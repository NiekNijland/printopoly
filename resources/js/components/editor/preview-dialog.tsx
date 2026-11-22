import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useEffect, useState, type MouseEvent } from 'react';

import {
    ElementPreview,
    editorSources,
    previewSize,
} from '@/components/editor/element-preview';
import { CloseIcon, FitIcon } from '@/components/icons';
import { Board, boardPropsOf } from '@/components/render';
import { Scaled } from '@/components/table/scaled';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';
import {
    PAWN_COUNT,
    deckCardKeys,
    deedKey,
    noteKey,
    pawnKey,
    BOX_LID_KEY,
    HOUSE_RULES_KEY,
    INVITATION_KEY,
    spaceKey,
} from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { Edition } from '@/lib/edition/types';
import type { PhotoInfos } from '@/lib/editor/photo-cache';
import { standardEdition } from '@/lib/game/standard-edition';
import { cn } from '@/lib/utils';

type PreviewTab =
    | 'board'
    | 'deeds'
    | 'cards'
    | 'money'
    | 'pawns'
    | 'box'
    | 'houseRules'
    | 'invitation';

/** The tabs after the board, each with the part that has to be on (B99, bug 8 of B138). */
const PART_TABS: readonly {
    tab: Exclude<PreviewTab, 'board'>;
    part: keyof Edition['parts'];
}[] = [
    { tab: 'deeds', part: 'deeds' },
    { tab: 'cards', part: 'cards' },
    { tab: 'money', part: 'money' },
    { tab: 'pawns', part: 'pawns' },
    { tab: 'box', part: 'boxLid' },
    { tab: 'houseRules', part: 'houseRules' },
    { tab: 'invitation', part: 'invitation' },
];

/** How wide one item of a tab is drawn, in px: small for cards, large for sheets. */
const ITEM_WIDTH: Partial<Record<PreviewTab, number>> = {
    money: 300,
    box: 300,
    houseRules: 220,
    invitation: 420,
};

interface PreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Puts the focus back where Voorbeeld was opened; the dialog has no trigger of its own. */
    onClosed?: () => void;
    edition: Edition;
    resolved: ResolvedEdition;
    photos: PhotoInfos;
    /** Jump to an element of the editor. */
    onJump: (key: string) => void;
}

const ZOOM_STEPS = [1, 1.5, 2, 3, 4] as const;

/** The keys shown on a tab, in order. */
function keysOf(tab: PreviewTab, edition: Edition): string[] {
    switch (tab) {
        case 'deeds':
            return Array.from(
                { length: standardEdition.components.titleDeeds },
                (_, i) => deedKey(i + 1),
            );
        case 'cards':
            return (['chance', 'chest'] as const).flatMap((deck) =>
                deckCardKeys(edition.elements, deck),
            );
        case 'money':
            return standardEdition.money.notes.map((note) =>
                noteKey(note.value),
            );
        case 'pawns':
            return Array.from({ length: PAWN_COUNT }, (_, i) =>
                pawnKey(i + 1),
            ).filter((key) => edition.elements[key]?.hidden !== true);
        case 'box':
            return [BOX_LID_KEY];
        case 'houseRules':
            return [HOUSE_RULES_KEY];
        case 'invitation':
            return [INVITATION_KEY];
        default:
            return [];
    }
}

/**
 * "Voorbeeld": the whole edition on one screen (V). The board is the real renderer at a large size with
 * zoom and scrolling (pinch works on a phone); the other tabs show every card, deed, note, pawn, the lid, the
 * house rules and the extra print as a grid, one tab per part that is on. Clicking an item opens it in the editor.
 */
export function PreviewDialog({
    open,
    onOpenChange,
    onClosed,
    edition,
    resolved,
    photos,
    onJump,
}: PreviewDialogProps) {
    const t = useTranslation();
    const tabs: PreviewTab[] = [
        'board',
        ...PART_TABS.filter(({ part }) => edition.parts[part]).map(
            ({ tab: id }) => id,
        ),
    ];
    const [tab, setTab] = useState<PreviewTab>('board');
    const [zoomIndex, setZoomIndex] = useState(0);
    const [width, setWidth] = useState(360);
    // A callback ref: the stage mounts inside the dialog's portal after `open` flips, so an effect on
    // `open` alone would run before the node exists and never measure.
    const [stage, setStage] = useState<HTMLDivElement | null>(null);
    const active = tabs.includes(tab) ? tab : 'board';

    // Fit to the width of the stage, again when it changes (rotating a phone, resizing a window).
    useEffect(() => {
        const node = stage;

        if (!open || node === null) {
            return;
        }
        // The board is square: fit it to the smaller side of the stage, so it fills the screen.
        const measure = (): void => {
            const side =
                node.clientHeight > 0
                    ? Math.min(node.clientWidth, node.clientHeight)
                    : node.clientWidth;

            setWidth(Math.max(240, side - 24));
        };

        measure();
        // The dialog animates in, so measure again once it has its final size.
        const frame = requestAnimationFrame(measure);
        if (typeof ResizeObserver === 'undefined') {
            return () => cancelAnimationFrame(frame);
        }
        const observer = new ResizeObserver(measure);

        observer.observe(node);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [open, active, stage]);

    const zoom = ZOOM_STEPS[zoomIndex] ?? 1;

    const jump = (key: string): void => {
        onOpenChange(false);
        onJump(key);
    };

    const onBoardClick = (event: MouseEvent<HTMLDivElement>): void => {
        const position = (event.target as HTMLElement).closest<HTMLElement>(
            '[data-position]',
        )?.dataset.position;

        if (position !== undefined) {
            jump(spaceKey(Number(position)));
        }
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/60" />
                <DialogPrimitive.Content
                    aria-describedby={undefined}
                    onCloseAutoFocus={(event) => {
                        if (onClosed !== undefined) {
                            event.preventDefault();
                            onClosed();
                        }
                    }}
                    className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-control border-2 border-ink bg-paper"
                >
                    {/* Title, zoom and close always share the first line, also with large letters on a small phone
                        (Gerda, R5-18); the tabs get a line of their own. */}
                    <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink bg-card p-2">
                        <DialogTitle className="m-0 min-w-0 flex-1 truncate font-display text-lg font-extrabold lg:text-xl">
                            {t('editor.preview_title')}
                        </DialogTitle>
                        <div
                            role="tablist"
                            aria-label={t('editor.preview_title')}
                            // On a phone the tabs scroll sideways; the fade at the end says there is more.
                            className="order-last flex min-w-0 basis-full gap-1 overflow-x-auto pr-8 [mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] lg:flex-wrap lg:overflow-visible lg:pr-0 lg:[mask-image:none]"
                        >
                            {tabs.map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={id === active}
                                    onClick={() => setTab(id)}
                                    className={cn(
                                        'min-h-11 shrink-0 cursor-pointer rounded-control border-2 border-ink px-3 text-sm font-semibold whitespace-nowrap',
                                        id === active
                                            ? 'bg-ink text-paper'
                                            : 'bg-card text-ink',
                                    )}
                                >
                                    {t(`editor.preview_${id}`)}
                                </button>
                            ))}
                        </div>
                        {active === 'board' && (
                            <div className="flex shrink-0 items-center gap-1">
                                <Button
                                    variant="icon"
                                    aria-label={t('editor.preview_zoom_out')}
                                    disabled={zoomIndex === 0}
                                    onClick={() =>
                                        setZoomIndex((i) => Math.max(0, i - 1))
                                    }
                                >
                                    −
                                </Button>
                                <Button
                                    variant="secondary"
                                    aria-label={t('editor.preview_fit')}
                                    onClick={() => setZoomIndex(0)}
                                    className="max-sm:w-11 max-sm:px-0"
                                >
                                    <FitIcon className="sm:hidden" />
                                    <span className="max-sm:hidden">
                                        {t('editor.preview_fit')}
                                    </span>
                                </Button>
                                <Button
                                    variant="icon"
                                    aria-label={t('editor.preview_zoom_in')}
                                    disabled={
                                        zoomIndex === ZOOM_STEPS.length - 1
                                    }
                                    onClick={() =>
                                        setZoomIndex((i) =>
                                            Math.min(
                                                ZOOM_STEPS.length - 1,
                                                i + 1,
                                            ),
                                        )
                                    }
                                >
                                    +
                                </Button>
                            </div>
                        )}
                        <DialogClose asChild>
                            <Button
                                variant="secondary"
                                aria-label={t('editor.preview_close')}
                                className="shrink-0 max-lg:w-11 max-lg:px-0"
                            >
                                <CloseIcon className="lg:hidden" />
                                <span className="max-lg:hidden">
                                    {t('editor.preview_close')}
                                </span>
                            </Button>
                        </DialogClose>
                    </div>

                    <div
                        ref={setStage}
                        className="min-h-0 flex-1 overflow-auto p-3"
                        data-testid="preview-stage"
                        data-keep-colors
                    >
                        {active === 'board' ? (
                            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                            <div
                                onClick={onBoardClick}
                                className="mx-auto w-fit cursor-pointer"
                                style={{ width: width * zoom }}
                            >
                                <Scaled
                                    widthMm={resolved.boardProfile.outer}
                                    heightMm={resolved.boardProfile.outer}
                                    width={width * zoom}
                                >
                                    {/* The same board as the editor and the print (bug 5 of ronde 3). */}
                                    <Board
                                        {...boardPropsOf(
                                            resolved,
                                            editorSources(photos),
                                        )}
                                    />
                                </Scaled>
                            </div>
                        ) : (
                            <ul className="m-0 flex list-none flex-wrap justify-center gap-3 p-0">
                                {keysOf(active, edition).map((key) => {
                                    const size = previewSize({ key }, edition);
                                    const itemWidth = ITEM_WIDTH[active] ?? 150;

                                    return (
                                        <li key={key}>
                                            <button
                                                type="button"
                                                onClick={() => jump(key)}
                                                aria-label={t(
                                                    'editor.preview_open',
                                                    {
                                                        key,
                                                    },
                                                )}
                                                className="cursor-pointer rounded-control border-2 border-transparent bg-transparent p-1 hover:border-ink focus-visible:border-ink"
                                            >
                                                <Scaled
                                                    widthMm={size.w}
                                                    heightMm={size.h}
                                                    width={itemWidth}
                                                >
                                                    <ElementPreview
                                                        target={{ key }}
                                                        resolved={resolved}
                                                        photos={photos}
                                                    />
                                                </Scaled>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
