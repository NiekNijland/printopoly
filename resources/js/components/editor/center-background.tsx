import { useRef, useState, type ChangeEvent, type RefObject } from 'react';

import { RangeField } from '@/components/editor/panel/panel-parts';
import { Button } from '@/components/ui/button';
import { useServices } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition, ElementOverride } from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import { ingestPhoto } from '@/lib/editor/ingest';
import type { PhotoCache } from '@/lib/editor/photo-cache';
import {
    actOnPlacement,
    placementDpi,
    startingPlacement,
    type PlacementAction,
    type PlacementContext,
} from '@/lib/editor/placements';
import type { Locale } from '@/lib/game/types';
import { placementTarget, resolutionLabel } from '@/lib/photos/resolution';
import { MAX_ZOOM, MIN_ZOOM } from '@/lib/photos/transform';
import { centerRect } from '@/lib/print/board';
import { CENTER_PHOTO_BLEED } from '@/lib/render/center-layout';

interface CenterBackgroundProps {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    override: ElementOverride | undefined;
    cache: PhotoCache;
    locale: Locale;
    /** The file field, so the layout choice can open it straight away (B187). */
    inputRef?: RefObject<HTMLInputElement | null>;
    /** Only the hidden file field: another layout is chosen, but this one may be picked next. */
    fieldOnly?: boolean;
}

const ARROWS = {
    left: '←',
    up: '↑',
    down: '↓',
    right: '→',
} as const;

/**
 * The photo over the whole board centre (B125): choose, zoom and move. It is the photo of the layout "Foto over het
 * hele midden" in the Afbeelding section (B187); another layout takes the same photo along.
 */
export function CenterBackground({
    session,
    edition,
    editKey,
    override,
    cache,
    locale,
    inputRef,
    fieldOnly = false,
}: CenterBackgroundProps) {
    const t = useTranslation();
    const { repository } = useServices();
    const ownInput = useRef<HTMLInputElement>(null);
    const input = inputRef ?? ownInput;
    const [problem, setProblem] = useState<string | null>(null);
    const placement = override?.background;
    const info =
        placement === undefined
            ? undefined
            : cache.getSnapshot().get(placement.photoId);
    const centre = centerRect(edition.boardProfile);
    const context: PlacementContext | null =
        info === undefined
            ? null
            : {
                  source: { w: info.width, h: info.height },
                  frame: { w: centre.w, h: centre.h },
                  // The photo reaches past the centre, as the home stickers print it (R5-03).
                  bleed: CENTER_PHOTO_BLEED,
              };

    const act = (action: PlacementAction): void => {
        if (placement === undefined || context === null) {
            return;
        }
        editElement(
            session,
            editKey,
            { background: actOnPlacement(placement, context, action) },
            `background:${editKey}`,
        );
    };

    const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file === undefined) {
            return;
        }
        setProblem(null);
        const result = await ingestPhoto(file, repository, edition.id);
        if (!result.ok) {
            setProblem(
                'storageFull' in result
                    ? `${result.fileName} ${t('editor.photo_storage_full')}`
                    : `${result.error.fileName} ${result.error.rest[locale]}`,
            );

            return;
        }
        cache.add(result.record);
        // One photo per centre (B187): a new photo over the whole centre takes the place of the one above the name.
        editElement(session, editKey, {
            background: startingPlacement(
                result.record.id,
                result.record,
                placementTarget(
                    { w: centre.w, h: centre.h },
                    CENTER_PHOTO_BLEED,
                ),
                true,
            ),
            photo: undefined,
            centerMode: undefined,
        });
    };

    const zoom = Math.round((placement?.scale ?? 1) * 100);
    const dpi =
        placement !== undefined && context !== null
            ? placementDpi(placement, context)
            : null;

    const field = (
        <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            hidden
            data-testid="background-input"
            onChange={(event) => void onFile(event)}
        />
    );

    // The file field stays at one place in the tree whatever is shown (R5-02): choosing "Foto over het hele midden"
    // opens it and then shows these tools, and a field that is mounted again in between drops the chosen file.
    return (
        <>
            {field}
            {!fieldOnly && (
                <div className="flex flex-col gap-3">
                    <p className="m-0 text-xs text-ink-soft">
                        {t('editor.background_hint')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            data-field="background"
                            variant="secondary"
                            onClick={() => input.current?.click()}
                        >
                            {placement === undefined
                                ? t('editor.photo_choose')
                                : t('editor.photo_replace')}
                        </Button>
                    </div>
                    {placement !== undefined && (
                        <>
                            <RangeField
                                label={t('editor.zoom')}
                                shown={
                                    <span className="font-mono font-normal">
                                        {zoom}%
                                    </span>
                                }
                                min={MIN_ZOOM * 100}
                                max={MAX_ZOOM * 100}
                                value={zoom}
                                valueText={`${String(zoom)}%`}
                                disabled={context === null}
                                onChange={(next) =>
                                    act({ type: 'zoom-to', scale: next / 100 })
                                }
                            />
                            <div className="flex flex-wrap gap-2">
                                {(['left', 'up', 'down', 'right'] as const).map(
                                    (direction) => (
                                        <Button
                                            key={direction}
                                            variant="icon"
                                            aria-label={t(
                                                `editor.dir_${direction}`,
                                            )}
                                            disabled={context === null}
                                            onClick={() =>
                                                act({
                                                    type: 'nudge',
                                                    direction,
                                                })
                                            }
                                        >
                                            {ARROWS[direction]}
                                        </Button>
                                    ),
                                )}
                            </div>
                            {dpi !== null && (
                                <p className="m-0 text-sm text-ink-soft">
                                    {resolutionLabel(dpi, locale)}
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
            {problem !== null && (
                <p role="alert" className="m-0 text-sm text-press">
                    {problem}
                </p>
            )}
        </>
    );
}
