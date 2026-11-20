import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useEffect, useRef, useState, type MouseEvent } from 'react';

import {
    ElementPreview,
    previewSize,
    toRenderLayers,
} from '@/components/editor/element-preview';
import { Board } from '@/components/render';
import { Scaled } from '@/components/table/scaled';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';
import {
    PAWN_COUNT,
    cardKey,
    deedKey,
    noteKey,
    pawnKey,
    BOX_LID_KEY,
    spaceKey,
} from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { Edition } from '@/lib/edition/types';
import { photoSource, type PhotoInfos } from '@/lib/editor/photo-cache';
import { standardEdition } from '@/lib/game/standard-edition';
import { cn } from '@/lib/utils';

type PreviewTab = 'board' | 'deeds' | 'cards' | 'money' | 'pawns' | 'box';

interface PreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
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
                standardEdition.decks[deck].map((_, i) => cardKey(deck, i + 1)),
            );
        case 'money':
            return standardEdition.money.notes.map((note) => noteKey(note.value));
        case 'pawns':
            return Array.from({ length: PAWN_COUNT }, (_, i) =>
                pawnKey(i + 1),
            ).filter((key) => edition.elements[key]?.hidden !== true);
        case 'box':
            return [BOX_LID_KEY];
        default:
            return [];
    }
}

/**
 * "Voorbeeld": the whole edition on one screen (V). The board is the real renderer at a large size with
 * zoom and scrolling (pinch works on a phone); the other tabs show every card, deed, note, pawn and the lid
 * as a grid. Clicking an item opens it in the editor.
 */
export function PreviewDialog({
    open,
    onOpenChange,
    edition,
    resolved,
    photos,
    onJump,
}: PreviewDialogProps) {
    const t = useTranslation();
    const tabs: PreviewTab[] = [
        'board',
        ...(edition.parts.deeds ? (['deeds'] as const) : []),
        ...(edition.parts.cards ? (['cards'] as const) : []),
        ...(edition.parts.money ? (['money'] as const) : []),
        ...(edition.parts.pawns ? (['pawns'] as const) : []),
        ...(edition.parts.boxLid ? (['box'] as const) : []),
    ];
    const [tab, setTab] = useState<PreviewTab>('board');
    const [zoomIndex, setZoomIndex] = useState(0);
    const [width, setWidth] = useState(360);
    const stage = useRef<HTMLDivElement>(null);
    const active = tabs.includes(tab) ? tab : 'board';

    // Fit to the width of the stage, again when it changes (rotating a phone, resizing a window).
    useEffect(() => {
        const node = stage.current;

        if (!open || node === null) {
            return;
        }
        const measure = (): void =>
            setWidth(Math.max(240, node.clientWidth - 24));

        measure();
        if (typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver(measure);

        observer.observe(node);

        return () => observer.disconnect();
    }, [open, active]);

    const common = {
        theme: resolved.theme,
        locale: resolved.language,
        currency: resolved.currency.id,
    } as const;
    const zoom = ZOOM_STEPS[zoomIndex] ?? 1;
    const spaces = Object.fromEntries(
        resolved.spaces.map((space, position) => [
            position,
            {
                name: space.name,
                town: space.town,
                photo: photoSource(space.photo, photos),
            },
        ]),
    );

    const jump = (key: string): void => {
        onOpenChange(false);
        onJump(key);
    };

    const onBoardClick = (event: MouseEvent<HTMLDivElement>): void => {
        const position = (event.target as HTMLElement)
            .closest<HTMLElement>('[data-position]')
            ?.dataset.position;

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
                    className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-control border-2 border-ink bg-paper"
                >
                    <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink bg-card p-2">
                        <DialogTitle className="m-0 mr-2 font-display text-xl font-extrabold">
                            {t('editor.preview_title')}
                        </DialogTitle>
                        <div
                            role="tablist"
                            aria-label={t('editor.preview_title')}
                            className="flex flex-1 flex-wrap gap-1"
                        >
                            {tabs.map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={id === active}
                                    onClick={() => setTab(id)}
                                    className={cn(
                                        'min-h-11 cursor-pointer rounded-control border-2 border-ink px-3 text-sm font-semibold',
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
                            <div className="flex items-center gap-1">
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
                                    onClick={() => setZoomIndex(0)}
                                >
                                    {t('editor.preview_fit')}
                                </Button>
                                <Button
                                    variant="icon"
                                    aria-label={t('editor.preview_zoom_in')}
                                    disabled={zoomIndex === ZOOM_STEPS.length - 1}
                                    onClick={() =>
                                        setZoomIndex((i) =>
                                            Math.min(ZOOM_STEPS.length - 1, i + 1),
                                        )
                                    }
                                >
                                    +
                                </Button>
                            </div>
                        )}
                        <DialogClose asChild>
                            <Button variant="secondary">{t('editor.preview_close')}</Button>
                        </DialogClose>
                    </div>

                    <div
                        ref={stage}
                        className="min-h-0 flex-1 overflow-auto p-3"
                        data-testid="preview-stage"
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
                                    <Board
                                        {...common}
                                        editionName={
                                            resolved.boardCenter.name ??
                                            resolved.name
                                        }
                                        profile={resolved.boardProfile}
                                        spaces={spaces}
                                        centerLayers={toRenderLayers(
                                            resolved.boardCenter.layers,
                                            photos,
                                        )}
                                    />
                                </Scaled>
                            </div>
                        ) : (
                            <ul className="m-0 flex list-none flex-wrap justify-center gap-3 p-0">
                                {keysOf(active, edition).map((key) => {
                                    const size = previewSize({ key }, edition);
                                    const itemWidth =
                                        active === 'money' || active === 'box'
                                            ? 300
                                            : 150;

                                    return (
                                        <li key={key}>
                                            <button
                                                type="button"
                                                onClick={() => jump(key)}
                                                aria-label={t('editor.preview_open', {
                                                    key,
                                                })}
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
