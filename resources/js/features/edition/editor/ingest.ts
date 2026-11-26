import {
    browserPreviewDeps,
    preparePhoto,
    type PrepareStage,
} from '@/features/edition/photos/preview';
import type { PhotoError } from '@/features/edition/photos/validation';
import type { EditionRepository } from '@/features/edition/repository';
import { isQuotaError } from '@/lib/render/edition-storage';
import type { PhotoRecord } from '@/lib/render/edition-types';

export type IngestResult =
    | { ok: true; record: PhotoRecord }
    | { ok: false; error: PhotoError }
    | { ok: false; storageFull: true; fileName: string };

/** HEIC to JPEG, loaded on demand: the converter is big and most photos are not HEIC. */
export const decodeHeic = async (blob: Blob): Promise<Blob> => {
    const { heicTo } = await import('heic-to');

    return heicTo({ blob, type: 'image/jpeg', quality: 0.92 });
};

/**
 * Validates a chosen file, makes its preview (HEIC is converted first) and stores both in
 * this browser (B61, B69, B70). Errors come back as data, with the texts of the Staten design.
 */
export const ingestPhoto = async (
    file: File,
    repository: EditionRepository,
    editionId: string,
    onStage?: (stage: PrepareStage) => void,
    decode: (blob: Blob) => Promise<Blob> = decodeHeic,
): Promise<IngestResult> => {
    const prepared = await preparePhoto(
        file,
        browserPreviewDeps(decode),
        onStage,
    );
    if (!prepared.ok) {
        return prepared;
    }
    try {
        const id = await repository.addPhoto(editionId, {
            blob: prepared.upload,
            preview: prepared.preview,
            width: prepared.size.w,
            height: prepared.size.h,
            fileName: file.name,
        });
        const record = await repository.getPhoto(id);
        if (record === undefined) {
            return { ok: false, storageFull: true, fileName: file.name };
        }

        return { ok: true, record };
    } catch (error) {
        if (isQuotaError(error)) {
            return { ok: false, storageFull: true, fileName: file.name };
        }
        throw error;
    }
};
