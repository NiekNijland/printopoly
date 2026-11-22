import { useEffect, useMemo, useState } from 'react';

import { useSyncExternalStore } from 'react';
import { editorSources } from '@/components/editor/element-preview';
import { Board, boardPropsOf } from '@/components/render';
import { useServices } from '@/hooks/use-editions';
import { usedPhotoIds } from '@/lib/edition/repository';
import { resolveEdition } from '@/lib/edition/resolve';
import type { Edition } from '@/lib/edition/types';
import { PhotoCache } from '@/lib/editor/photo-cache';

const PX_PER_MM = 96 / 25.4;

interface EditionThumbnailProps {
    editionId: string;
    /** Changes with every save of the edition, so the render follows a rename or a new photo. */
    version?: number;
    /** Edge of the square thumbnail in px. */
    size?: number;
    label: string;
}

/** A render of the edition's own board, scaled down (B96). */
export function EditionThumbnail({
    editionId,
    version = 0,
    size = 168,
    label,
}: EditionThumbnailProps) {
    const { repository } = useServices();
    const [edition, setEdition] = useState<Edition | null>(null);
    const [cache] = useState(
        () => new PhotoCache((id) => repository.getPhoto(id)),
    );
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);

    useEffect(() => {
        let alive = true;
        void repository
            .get(editionId)
            .then((found) => {
                if (alive && found !== undefined) {
                    setEdition(found);
                    cache.request(usedPhotoIds(found.elements));
                }
            })
            .catch(() => undefined);

        return () => {
            alive = false;
            cache.dispose();
        };
    }, [repository, editionId, version, cache]);

    const resolved = useMemo(
        () => (edition === null ? null : resolveEdition(edition)),
        [edition],
    );

    if (edition === null || resolved === null) {
        return (
            <div
                role="img"
                aria-label={label}
                style={{ width: size, height: size }}
                className="rounded-control bg-board"
            />
        );
    }

    const scale = size / (edition.boardProfile.outer * PX_PER_MM);

    return (
        <div
            role="img"
            aria-label={label}
            data-keep-colors
            style={{ width: size, height: size }}
            className="relative overflow-hidden rounded-control border-2 border-ink bg-board"
        >
            <div
                aria-hidden="true"
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: '0 0',
                    width: `${edition.boardProfile.outer}mm`,
                    height: `${edition.boardProfile.outer}mm`,
                }}
            >
                <Board {...boardPropsOf(resolved, editorSources(photos))} />
            </div>
        </div>
    );
}
