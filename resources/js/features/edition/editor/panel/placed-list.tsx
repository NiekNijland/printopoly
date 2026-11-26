import { useEffect, useRef, useState, type ReactNode } from 'react';

import { CloseIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    NativeSelect,
    NativeSelectOption,
} from '@/components/ui/native-select';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { cn } from '@/lib/utils';

import type { Placed } from './place-photo';

type Batch = Extract<Placed, { kind: 'batch' }>;

/** A small square of the photo, so the list says which photo it is and not only its file name. */
const Thumb = ({
    url,
    grayscale,
    waiting = false,
}: {
    url?: string;
    grayscale?: boolean;
    /** A photo that has no place yet: a dashed edge. */
    waiting?: boolean;
}) => {
    const [broken, setBroken] = useState(false);

    return (
        <span
            aria-hidden="true"
            className={cn(
                'row-span-2 size-14 shrink-0 self-center overflow-hidden rounded-control border bg-table',
                waiting
                    ? 'border-2 border-dashed border-ink-soft'
                    : 'border-line-strong',
            )}
        >
            {url !== undefined && !broken && (
                <img
                    src={url}
                    alt=""
                    onError={() => setBroken(true)}
                    className="size-full object-cover"
                    style={{
                        filter: grayscale === true ? 'grayscale(1)' : undefined,
                    }}
                />
            )}
        </span>
    );
};

/** One row: the photo, its file name with what happened, and the choice where it goes. */
const Row = ({
    thumb,
    file,
    tags,
    children,
    how,
}: {
    thumb: ReactNode;
    file: string;
    tags?: ReactNode;
    children: ReactNode;
    how?: string;
}) => {
    return (
        <li
            data-placed-how={how}
            className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1"
        >
            {thumb}
            <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate font-mono text-xs text-ink-soft">
                    {file}
                </span>
                {tags}
            </span>
            {children}
        </li>
    );
};

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
    const taken = new Set(placed.items.map((item) => item.key));

    // A new list comes into view, also when the panel was scrolled down to the photo field (bug 7).
    useEffect(() => {
        box.current?.scrollIntoView?.({ block: scrollTo, behavior: 'smooth' });
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
                <ol className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
                    {placed.items.map((item, index) => (
                        <Row
                            key={item.file + String(index)}
                            how={item.how}
                            file={item.file}
                            thumb={
                                <Thumb
                                    url={
                                        photos?.get(item.placement.photoId)?.url
                                    }
                                    grayscale={item.placement.grayscale}
                                />
                            }
                            tags={
                                <>
                                    {item.how === 'name' && (
                                        <Badge
                                            variant="secondary"
                                            className="flex-none text-xs"
                                        >
                                            {t('editor.photos_how_name')}
                                        </Badge>
                                    )}
                                    {item.replaced && (
                                        <Badge
                                            variant="neutral"
                                            className="flex-none text-xs"
                                        >
                                            {t('editor.photos_replaced')}
                                        </Badge>
                                    )}
                                </>
                            }
                        >
                            {placed.pool.length > 1 ? (
                                <NativeSelect
                                    aria-label={t('editor.photos_move', {
                                        file: item.file,
                                    })}
                                    value={item.key}
                                    onChange={(event) =>
                                        onMove(index, event.target.value)
                                    }
                                    className="h-10 text-sm font-semibold"
                                >
                                    {placed.pool.map((option) => (
                                        <NativeSelectOption
                                            key={option.key}
                                            value={option.key}
                                        >
                                            {option.label}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            ) : (
                                <span className="min-w-0 truncate font-semibold">
                                    <span className="sr-only">
                                        {t('editor.photos_went_to')}{' '}
                                    </span>
                                    {item.label}
                                </span>
                            )}
                        </Row>
                    ))}
                </ol>
            )}
            {!placed.undone && placed.missed.length > 0 && (
                <div
                    className="flex flex-col gap-2 border-t border-dashed border-line-strong pt-3"
                    data-testid="photos-missed"
                >
                    <p className="m-0 text-sm font-semibold">
                        {tc('editor.photos_missed', placed.missed.length)}
                    </p>
                    <ol className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
                        {placed.missed.map((photo, index) => (
                            <Row
                                key={photo.name + String(index)}
                                file={photo.name}
                                thumb={
                                    <Thumb
                                        url={
                                            photo.url === ''
                                                ? undefined
                                                : photo.url
                                        }
                                        waiting
                                    />
                                }
                            >
                                <NativeSelect
                                    aria-label={t('editor.photos_move', {
                                        file: photo.name,
                                    })}
                                    value=""
                                    onChange={(event) =>
                                        onPlaceMissed(index, event.target.value)
                                    }
                                    className="h-10 text-sm font-semibold"
                                >
                                    <NativeSelectOption value="" disabled>
                                        {t('editor.photos_pick_space')}
                                    </NativeSelectOption>
                                    {placed.pool
                                        .filter(
                                            (option) => !taken.has(option.key),
                                        )
                                        .map((option) => (
                                            <NativeSelectOption
                                                key={option.key}
                                                value={option.key}
                                            >
                                                {option.label}
                                            </NativeSelectOption>
                                        ))}
                                </NativeSelect>
                            </Row>
                        ))}
                    </ol>
                </div>
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
