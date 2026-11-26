import { useEffect, useRef } from 'react';

import { CloseIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { cn } from '@/lib/utils';

import type { Placed } from './place-photo';
import { MissedRows, PlacedRows } from './placed-rows';

type Batch = Extract<Placed, { kind: 'batch' }>;

/**
 * The list after a choice of several photos (ronde 3, UX 1; ronde 4, UX 4; B237): which photo went on which
 * element, found by its name or put on the next empty one, with a choice per row to put it on another element.
 * Photos that found no element come last with the question where they go. One button puts everything back. The
 * list sits where the photos were chosen (under the photo field, or on top of the list of spaces) and comes into
 * view by itself. It stays until the next choice or until it is closed, so you can check the elements first.
 */
export const PlacedList = ({
    placed,
    photos,
    onUndo,
    onClose,
    onMove,
    onPlaceMissed,
    className,
    scrollTo = 'nearest',
}: {
    placed: Batch;
    /** The photos of this browser, for a small preview per row. */
    photos?: PhotoInfos;
    onUndo: () => void;
    onClose: () => void;
    onMove: (index: number, key: string) => void;
    onPlaceMissed: (index: number, key: string) => void;
    className?: string;
    /** How the list comes into view: in the panel the nearest edge, on top of the list of spaces its top. */
    scrollTo?: ScrollLogicalPosition;
}) => {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const box = useRef<HTMLDivElement>(null);
    const first = placed.items[0]?.file ?? placed.missed[0]?.name;
    const named = placed.items.filter((item) => item.how === 'name').length;

    // A new list comes into view, also when the panel was scrolled down to the photo field (bug 7).
    useEffect(() => {
        const node = box.current;
        if (typeof node?.scrollIntoView === 'function') {
            node.scrollIntoView({ block: scrollTo, behavior: 'smooth' });
        }
    }, [first, scrollTo]);

    const title = placed.undone
        ? tc('editor.photos_undone', placed.items.length)
        : placed.items.length === 0
          ? tc('editor.photos_none_found', placed.missed.length)
          : tc('editor.photos_placed_title', placed.items.length);

    return (
        <div
            ref={box}
            role="status"
            className={cn(
                'flex scroll-mt-20 flex-col gap-3 rounded-control border-2 border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]',
                className,
            )}
            data-testid="photos-placed"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="m-0 font-display text-base font-extrabold">
                        {title}
                    </p>
                    {!placed.undone && named > 0 && (
                        <p className="m-0 text-sm text-ink-soft">
                            {named === placed.items.length &&
                            placed.missed.length === 0
                                ? t('editor.photos_all_by_name')
                                : tc('editor.photos_by_name', named)}
                        </p>
                    )}
                </div>
                <Button
                    variant="icon"
                    className="-mt-1 -mr-1 size-9 min-h-9"
                    aria-label={t('editor.photos_close')}
                    onClick={onClose}
                >
                    <CloseIcon size={16} />
                </Button>
            </div>
            {!placed.undone && placed.items.length > 0 && (
                <PlacedRows placed={placed} photos={photos} onMove={onMove} />
            )}
            {!placed.undone && placed.missed.length > 0 && (
                <MissedRows placed={placed} onPlaceMissed={onPlaceMissed} />
            )}
            {placed.note !== '' && !placed.undone && (
                <p className="m-0 text-xs text-ink-soft">{placed.note}</p>
            )}
            {!placed.undone && placed.items.length > 0 && (
                <div>
                    <Button variant="secondary" onClick={onUndo}>
                        {t('editor.photos_undo')}
                    </Button>
                </div>
            )}
        </div>
    );
};
