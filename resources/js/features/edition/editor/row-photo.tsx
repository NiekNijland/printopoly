import type { Dispatch, HTMLAttributes, SetStateAction } from 'react';

import { useTranslation } from '@/hooks/use-translation';
import type { Edition } from '@/lib/render/edition-types';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { swapsPhoto } from '@/lib/render/editor-photo-swap';
import { cn } from '@/lib/utils';

/** The type of a photo dragged between rows of the list, so a drop of files is not mistaken for it. */
const PHOTO_DRAG = 'application/x-printopoly-photo';

/** The small photo at the end of a row; with a mouse it can be dragged to another row. */
export const RowPhoto = ({
    elementKey: key,
    edition,
    photos,
    label,
    draggable,
    dragged,
    onDragStart,
    onDragEnd,
}: {
    elementKey: string;
    edition: Edition;
    photos: PhotoInfos | undefined;
    label: string;
    draggable: boolean;
    dragged: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
}) => {
    const t = useTranslation();
    const placement = edition.elements[key]?.photo;
    const url =
        placement === undefined
            ? undefined
            : photos?.get(placement.photoId)?.url;
    if (url === undefined || !swapsPhoto(key)) {
        return null;
    }

    return (
        <span
            role="img"
            aria-label={t(
                draggable ? 'editor.photo_drag_label' : 'editor.layer_photo',
                { name: label },
            )}
            title={
                draggable
                    ? t('editor.photo_drag_label', { name: label })
                    : undefined
            }
            draggable={draggable}
            data-row-photo={key}
            onDragStart={(event) => {
                event.dataTransfer.setData(PHOTO_DRAG, key);
                event.dataTransfer.effectAllowed = 'move';
                onDragStart();
            }}
            onDragEnd={onDragEnd}
            className={cn(
                'size-8 flex-none overflow-hidden rounded-control border border-line-strong bg-table',
                draggable && 'cursor-grab active:cursor-grabbing',
                dragged && 'opacity-40',
            )}
        >
            <img
                src={url}
                alt=""
                draggable={false}
                className="pointer-events-none size-full object-cover"
                style={{
                    filter: placement?.grayscale ? 'grayscale(1)' : undefined,
                }}
            />
        </span>
    );
};

export type PhotoDrag = { from: string; over: string | null };

/** A row a dragged photo can land on: another street, station or utility. */
export const photoDrop = (
    key: string,
    photoDrag: PhotoDrag | null,
    setPhotoDrag: Dispatch<SetStateAction<PhotoDrag | null>>,
    onSwapPhoto: ((from: string, to: string) => void) | undefined,
): HTMLAttributes<HTMLDivElement> | undefined =>
    onSwapPhoto === undefined || !swapsPhoto(key)
        ? undefined
        : {
              onDragOver: (event) => {
                  if (
                      photoDrag === null ||
                      photoDrag.from === key ||
                      !event.dataTransfer.types.includes(PHOTO_DRAG)
                  ) {
                      return;
                  }
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  if (photoDrag.over !== key) {
                      setPhotoDrag({ ...photoDrag, over: key });
                  }
              },
              onDragLeave: () =>
                  setPhotoDrag((current) =>
                      current?.over === key
                          ? { ...current, over: null }
                          : current,
                  ),
              onDrop: (event) => {
                  const from = event.dataTransfer.getData(PHOTO_DRAG);
                  if (from === '' || from === key) {
                      return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  setPhotoDrag(null);
                  onSwapPhoto(from, key);
              },
          };
