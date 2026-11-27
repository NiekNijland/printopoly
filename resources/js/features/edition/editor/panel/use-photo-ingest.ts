import { useState } from 'react';

import { ingestPhoto } from '@/features/edition/editor/ingest';
import type { PhotoError } from '@/features/edition/photos/validation';
import { useServices } from '@/features/edition/use-editions';
import type { Edition, PhotoRecord } from '@/lib/render/edition-types';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';

export type Upload =
    | { kind: 'working'; name: string; stage: 'converting' | 'resizing' }
    | { kind: 'error'; error: PhotoError }
    | { kind: 'storage-full'; name: string };

export const usePhotoIngest = (edition: Edition, cache: PhotoCache) => {
    const { repository } = useServices();
    const [uploads, setUploads] = useState<Upload[]>([]);

    /** Reads a file into this browser's photos; `null` when it could not be used (the error shows). */
    const ingest = async (file: File): Promise<PhotoRecord | null> => {
        const result = await ingestPhoto(
            file,
            repository,
            edition.id,
            (stage) =>
                setUploads((list) => [
                    ...list.filter(
                        (item) =>
                            item.kind !== 'working' || item.name !== file.name,
                    ),
                    { kind: 'working', name: file.name, stage },
                ]),
        );
        setUploads((list) =>
            list.filter(
                (item) => item.kind !== 'working' || item.name !== file.name,
            ),
        );
        if (!result.ok) {
            setUploads((list) => [
                ...list,
                'storageFull' in result
                    ? { kind: 'storage-full', name: result.fileName }
                    : { kind: 'error', error: result.error },
            ]);

            return null;
        }
        cache.add(result.record);

        return result.record;
    };

    return { uploads, setUploads, ingest };
};
