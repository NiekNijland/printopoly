import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { PhotosIcon } from '@/components/ui/icons';
import { useTranslation } from '@/hooks/use-translation';

import { PHOTO_ACCEPT } from './panel/image-section';
import type { PhotoUpload } from './panel/use-photo-upload';

/**
 * "Foto's" next to the search of the board list (B237): the photo version of pasting a list of names. Choose many
 * photos at once (on a phone from the camera roll); a photo named after a space or a pawn lands there, and the
 * summary under the field says what went where and asks about the rest.
 */
export const ListPhotosButton = ({ upload }: { upload: PhotoUpload }) => {
    const t = useTranslation();
    const input = useRef<HTMLInputElement>(null);

    return (
        <>
            <Button
                variant="secondary"
                data-list-photos
                aria-label={t('editor.list_photos_label')}
                title={t('editor.list_photos_label')}
                onClick={() => input.current?.click()}
                className="size-11 min-h-11 flex-none gap-1.5 px-0 min-[400px]:px-0 @[22rem]:w-auto @[22rem]:px-3 @[22rem]:min-[400px]:px-3"
            >
                <PhotosIcon size={20} />
                {/* The word only where the list is wide enough: the narrow column keeps its search readable. */}
                <span aria-hidden="true" className="hidden @[22rem]:inline">
                    {t('editor.list_photos')}
                </span>
            </Button>
            <input
                ref={input}
                type="file"
                accept={PHOTO_ACCEPT}
                multiple
                hidden
                data-testid="list-photos-input"
                onChange={upload.choose}
            />
        </>
    );
};
