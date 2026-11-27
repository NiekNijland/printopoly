import { usePage } from '@inertiajs/react';
import { useState, type ChangeEvent } from 'react';

import { editElement } from '@/features/edition/editor/edit';
import { ingestPhoto } from '@/features/edition/editor/ingest';
import type { EditionSession } from '@/features/edition/session';
import { useServices } from '@/features/edition/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import { BOARD_CENTER_KEY } from '@/lib/render/edition-keys';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type {
    Edition,
    FreeLayer,
    PhotoRecord,
} from '@/lib/render/edition-types';
import {
    newCenterLayerSpot,
    placeNewCenterLayer,
} from '@/lib/render/editor-layer-placement';
import {
    newPhotoLayer,
    newTextLayer,
    replaceLayer,
    type LayerArea,
} from '@/lib/render/editor-layers';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import { startingPlacement } from '@/lib/render/editor-placements';
import type { Locale } from '@/types/game';

type LayerActionsOptions = {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    area: LayerArea;
    layers: readonly FreeLayer[];
    onSelect: (id: string | null) => void;
    cache: PhotoCache;
};

// On the board centre a new layer starts in the free square the title does not use, clear of the folds (B187).
const newLayerSpot = (edition: Edition, editKey: string) =>
    editKey === BOARD_CENTER_KEY
        ? newCenterLayerSpot(
              edition.boardProfile,
              edition.elements[editKey]?.centerPlace ?? 'topRight',
          )
        : undefined;

// On the board centre a new layer goes where it hides nothing: not on the name, the photo or another layer (R5-07).
const placeNewLayer = (
    edition: Edition,
    editKey: string,
    layer: FreeLayer,
    current: readonly FreeLayer[],
) =>
    editKey === BOARD_CENTER_KEY
        ? placeNewCenterLayer(
              layer,
              edition,
              resolveEdition(edition).boardCenter,
              current,
          )
        : layer;

export const usePhotoPick = (
    editionId: string,
    cache: PhotoCache,
    locale: Locale,
) => {
    const t = useTranslation();
    const { repository } = useServices();
    const [problem, setProblem] = useState<string | null>(null);

    const pick = async (
        event: ChangeEvent<HTMLInputElement>,
        onRecord: (record: PhotoRecord) => void,
    ): Promise<void> => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file === undefined) {
            return;
        }
        setProblem(null);
        const result = await ingestPhoto(file, repository, editionId);
        if (!result.ok) {
            setProblem(
                'storageFull' in result
                    ? `${result.fileName} ${t('editor.photo_storage_full')}`
                    : `${result.error.fileName} ${result.error.rest[locale]}`,
            );

            return;
        }
        cache.add(result.record);
        onRecord(result.record);
    };

    return { problem, pick };
};

export const useLayerActions = ({
    session,
    edition,
    editKey,
    area,
    layers,
    onSelect,
    cache,
}: LayerActionsOptions) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const { problem, pick } = usePhotoPick(edition.id, cache, locale);

    const write = (next: FreeLayer[], group: string | null = null): void =>
        editElement(session, editKey, { layers: next }, group);

    const change = (layer: FreeLayer, group: string): void =>
        write(
            replaceLayer(
                session.edition.elements[editKey]?.layers ?? [],
                layer,
            ),
            group,
        );

    const spot = newLayerSpot(edition, editKey);
    const placed = (layer: FreeLayer, current: readonly FreeLayer[]) =>
        placeNewLayer(session.edition, editKey, layer, current);

    const addText = (): void => {
        const layer = placed(
            newTextLayer(layers, area, t('editor.layer_new_text'), spot),
            layers,
        );
        write([...layers, layer]);
        onSelect(layer.id);
    };

    const onFile = (event: ChangeEvent<HTMLInputElement>): Promise<void> =>
        pick(event, (record) => {
            const current = session.edition.elements[editKey]?.layers ?? [];
            const layer = placed(
                newPhotoLayer(
                    current,
                    area,
                    startingPlacement(record.id, record),
                    spot,
                ),
                current,
            );
            write([...current, layer]);
            onSelect(layer.id);
        });

    const remove = (id: string): void => {
        write(layers.filter((item) => item.id !== id));
        onSelect(null);
    };

    return { problem, change, addText, onFile, remove };
};
