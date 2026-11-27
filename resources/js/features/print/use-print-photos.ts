import { useEffect, useState, useSyncExternalStore } from 'react';

import type { PrintServices } from '@/features/print/print-page-setup';
import type { Edition } from '@/lib/render/edition-types';
import { PhotoCache, type PhotoInfos } from '@/lib/render/editor-photo-cache';

/** The thumbnails show the photos of this browser (the editor keeps every photo here). */
export const usePrintPhotos = (
    services: PrintServices,
    drawn: Edition,
    checked: Edition | null,
): PhotoInfos => {
    const [cache] = useState(
        () => new PhotoCache((id) => services.storage().getPhoto(id)),
    );
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);

    useEffect(() => {
        cache.request([
            ...new Set([
                ...services.photoIds(drawn.elements),
                ...(checked === null
                    ? []
                    : services.photoIds(checked.elements)),
            ]),
        ]);
    }, [cache, drawn, checked, services]);

    useEffect(() => {
        return () => {
            cache.dispose();
        };
    }, [cache]);

    return photos;
};
