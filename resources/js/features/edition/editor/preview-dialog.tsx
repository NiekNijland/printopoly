import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DialogClose, DialogTitle } from '@/components/ui/dialog';
import { CloseIcon, FitIcon } from '@/components/ui/icons';
import {
    PreviewBoard,
    PreviewItems,
    type PreviewTab,
} from '@/features/edition/editor/preview-content';
import { useTranslation } from '@/hooks/use-translation';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { cn } from '@/lib/utils';

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

type PreviewDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Puts the focus back where Voorbeeld was opened; the dialog has no trigger of its own. */
    onClosed?: () => void;
    edition: Edition;
    resolved: ResolvedEdition;
    photos: PhotoInfos;
    /** Jump to an element of the editor. */
    onJump: (key: string) => void;
};

const ZOOM_STEPS = [1, 1.5, 2, 3, 4] as const;

const useStageWidth = (
    open: boolean,
    active: PreviewTab,
    stage: HTMLDivElement | null,
): number => {
    const [width, setWidth] = useState(360);

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

    return width;
};

type PreviewTabsProps = {
    tabs: PreviewTab[];
    active: PreviewTab;
    onTab: (tab: PreviewTab) => void;
};

const PreviewTabs = ({ tabs, active, onTab }: PreviewTabsProps) => {
    const t = useTranslation();

    return (
        <div
            role="tablist"
            aria-label={t('editor.preview_title')}
            // On a phone the tabs scroll sideways; the fade at the end says there is more.
            className="order-last flex min-w-0 basis-full overflow-x-auto [mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] pr-8 lg:overflow-visible lg:[mask-image:none] lg:pr-0"
        >
            {/* One bar, like the tabs of the editor: the chosen part inked (R6 Tom, B262). */}
            <div className="flex w-max flex-none overflow-hidden rounded-control border-2 border-ink bg-card">
                {tabs.map((id) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={id === active}
                        onClick={() => onTab(id)}
                        className={cn(
                            'min-h-11 shrink-0 cursor-pointer border-0 border-l-2 border-ink px-3 text-sm font-semibold whitespace-nowrap first:border-l-0 focus-visible:-outline-offset-4',
                            id === active
                                ? 'bg-ink text-paper focus-visible:outline-paper'
                                : 'bg-card text-ink hover:bg-table',
                        )}
                    >
                        {t(`editor.preview_${id}`)}
                    </button>
                ))}
            </div>
        </div>
    );
};

type ZoomButtonsProps = {
    zoomIndex: number;
    onZoom: (update: (index: number) => number) => void;
};

const ZoomButtons = ({ zoomIndex, onZoom }: ZoomButtonsProps) => {
    const t = useTranslation();

    return (
        <div className="flex shrink-0 items-center gap-1">
            <Button
                variant="icon"
                aria-label={t('editor.preview_zoom_out')}
                disabled={zoomIndex === 0}
                onClick={() => onZoom((i) => Math.max(0, i - 1))}
            >
                −
            </Button>
            <Button
                variant="secondary"
                aria-label={t('editor.preview_fit')}
                onClick={() => onZoom(() => 0)}
                className="max-sm:w-11 max-sm:px-0!"
            >
                <FitIcon className="sm:hidden" />
                <span className="max-sm:hidden">{t('editor.preview_fit')}</span>
            </Button>
            <Button
                variant="icon"
                aria-label={t('editor.preview_zoom_in')}
                disabled={zoomIndex === ZOOM_STEPS.length - 1}
                onClick={() =>
                    onZoom((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
                }
            >
                +
            </Button>
        </div>
    );
};

type PreviewHeaderProps = PreviewTabsProps & ZoomButtonsProps;

const PreviewHeader = ({
    tabs,
    active,
    onTab,
    zoomIndex,
    onZoom,
}: PreviewHeaderProps) => {
    const t = useTranslation();

    return (
        <>
            {/* Title, zoom and close always share the first line, also with large letters on a small phone
                        (Gerda, R5-18); the tabs get a line of their own. */}
            <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink bg-card p-2">
                <DialogTitle className="m-0 min-w-0 flex-1 truncate font-display text-lg font-extrabold lg:text-xl">
                    {t('editor.preview_title')}
                </DialogTitle>
                <PreviewTabs tabs={tabs} active={active} onTab={onTab} />
                {active === 'board' && (
                    <ZoomButtons zoomIndex={zoomIndex} onZoom={onZoom} />
                )}
                <DialogClose asChild>
                    <Button
                        variant="secondary"
                        aria-label={t('editor.preview_close')}
                        className="shrink-0 max-lg:w-11 max-lg:px-0!"
                    >
                        <CloseIcon className="lg:hidden" />
                        <span className="max-lg:hidden">
                            {t('editor.preview_close')}
                        </span>
                    </Button>
                </DialogClose>
            </div>
        </>
    );
};

/**
 * "Voorbeeld": the whole edition on one screen (V). The board is the real renderer at a large size with
 * zoom and scrolling (pinch works on a phone); the other tabs show every card, deed, note, pawn, the lid, the
 * house rules and the extra print as a grid, one tab per part that is on. Clicking an item opens it in the editor.
 */
export const PreviewDialog = ({
    open,
    onOpenChange,
    onClosed,
    edition,
    resolved,
    photos,
    onJump,
}: PreviewDialogProps) => {
    const tabs: PreviewTab[] = [
        'board',
        ...PART_TABS.filter(({ part }) => edition.parts[part]).map(
            ({ tab: id }) => id,
        ),
    ];
    const [tab, setTab] = useState<PreviewTab>('board');
    const [zoomIndex, setZoomIndex] = useState(0);
    // A callback ref: the stage mounts inside the dialog's portal after `open` flips, so an effect on
    // `open` alone would run before the node exists and never measure.
    const [stage, setStage] = useState<HTMLDivElement | null>(null);
    const active = tabs.includes(tab) ? tab : 'board';
    const width = useStageWidth(open, active, stage);

    const zoom = ZOOM_STEPS[zoomIndex] ?? 1;

    const jump = (key: string): void => {
        onOpenChange(false);
        onJump(key);
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
                    <PreviewHeader
                        tabs={tabs}
                        active={active}
                        onTab={setTab}
                        zoomIndex={zoomIndex}
                        onZoom={setZoomIndex}
                    />

                    <div
                        ref={setStage}
                        className="min-h-0 flex-1 overflow-auto p-3"
                        data-testid="preview-stage"
                        data-keep-colors
                    >
                        {active === 'board' ? (
                            <PreviewBoard
                                width={width * zoom}
                                resolved={resolved}
                                photos={photos}
                                onJump={jump}
                            />
                        ) : (
                            <PreviewItems
                                active={active}
                                edition={edition}
                                resolved={resolved}
                                photos={photos}
                                onJump={jump}
                            />
                        )}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};
