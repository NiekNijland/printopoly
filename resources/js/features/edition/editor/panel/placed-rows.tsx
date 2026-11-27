import { useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import {
    NativeSelect,
    NativeSelectOption,
} from '@/components/ui/native-select';
import type { Placed } from '@/features/edition/editor/panel/place-photo';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { cn } from '@/lib/utils';

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

export const PlacedRows = ({
    placed,
    photos,
    onMove,
}: {
    placed: Batch;
    photos?: PhotoInfos;
    onMove: (index: number, key: string) => void;
}) => {
    const t = useTranslation();

    return (
        <ol className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
            {placed.items.map((item, index) => (
                <Row
                    key={item.file + String(index)}
                    how={item.how}
                    file={item.file}
                    thumb={
                        <Thumb
                            url={photos?.get(item.placement.photoId)?.url}
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
    );
};

export const MissedRows = ({
    placed,
    onPlaceMissed,
}: {
    placed: Batch;
    onPlaceMissed: (index: number, key: string) => void;
}) => {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const taken = new Set(placed.items.map((item) => item.key));

    return (
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
                                url={photo.url === '' ? undefined : photo.url}
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
                                .filter((option) => !taken.has(option.key))
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
    );
};
