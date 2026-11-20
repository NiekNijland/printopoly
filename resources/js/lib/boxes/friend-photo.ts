import { decodeHeic } from '@/lib/editor/ingest';
import type { Locale } from '@/lib/game/types';
import { browserPreviewDeps, preparePhoto } from '@/lib/photos/preview';
import { formatPhotoError } from '@/lib/photos/validation';

export type FriendPhoto =
    | { ok: true; upload: Blob; preview: Blob; width: number; height: number }
    | { ok: false; message: string };

/**
 * A friend's chosen photo, checked in the browser first (type by content, size, pixels) with the same rules as
 * the owner's (B69). HEIC from an iPhone becomes a JPEG here. The server checks again, because it trusts nothing.
 */
export async function prepareFriendPhoto(
    file: File,
    locale: Locale,
    onStage?: (stage: 'converting' | 'resizing') => void,
): Promise<FriendPhoto> {
    const prepared = await preparePhoto(
        file,
        browserPreviewDeps(decodeHeic),
        onStage,
    );

    return prepared.ok
        ? {
              ok: true,
              upload: prepared.upload,
              preview: prepared.preview,
              width: prepared.size.w,
              height: prepared.size.h,
          }
        : { ok: false, message: formatPhotoError(prepared.error, locale) };
}
