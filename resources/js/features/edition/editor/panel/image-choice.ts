import type { ReactNode } from 'react';

import type { EditionSession } from '@/features/edition/session';
import type { Edition, ElementOverride } from '@/lib/render/edition-types';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';

/** What an element shows in its Afbeelding section (§3.4). */
export type ImageChoice =
    'none' | 'photo' | 'standard' | 'preset' | 'upload' | 'pattern' | 'logo';

export const clearsSomething = (
    now: ElementOverride | undefined,
    patch: Partial<ElementOverride>,
): boolean => {
    const fields = Object.keys(patch);

    return Object.entries<unknown>(now ?? {}).some(
        ([field, value]) => value !== undefined && fields.includes(field),
    );
};

export type ImageParts = {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    override: ElementOverride | undefined;
    cache: PhotoCache;
    waiting: ImageChoice | null;
    wait: (choice: ImageChoice) => void;
    hold: (choice: ImageChoice | null) => void;
    clear: (patch: Partial<ElementOverride>) => void;
    openFiles: () => void;
    photoField: Partial<Record<ImageChoice, string>>;
    fileField: ReactNode;
    photoPart: ReactNode;
    choosePart: ReactNode;
    status: ReactNode;
    where: string | null;
};
