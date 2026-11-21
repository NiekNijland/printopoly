import { useRef, useState, type ChangeEvent } from 'react';

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
import { resolutionLabel } from '@/lib/photos/resolution';
import { MAX_ZOOM, MIN_ZOOM } from '@/lib/photos/transform';
import { centerRect } from '@/lib/print/board';

interface CenterBackgroundProps {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    override: ElementOverride | undefined;
    cache: PhotoCache;
    locale: Locale;
}

const ARROWS = {
    left: '←',
    up: '↑',
    down: '↓',
    right: '→',
} as const;

/**
 * The photo over the whole board centre (B125): choose, zoom and move. It sits under "Wat ligt eronder" in the
 * Afbeelding section; going back to board green there removes it.
 */
export function CenterBackground({
    session,
    edition,
    editKey,
    override,
    cache,
    locale,
}: CenterBackgroundProps) {
    const t = useTranslation();
    const { repository } = useServices();
    const input = useRef<HTMLInputElement>(null);
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
                  bleed: 0,
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
        editElement(session, editKey, {
            background: startingPlacement(result.record.id, result.record),
        });
    };

    const zoom = Math.round((placement?.scale ?? 1) * 100);
    const dpi =
        placement !== undefined && context !== null
            ? placementDpi(placement, context)
            : null;

    return (
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
                <input
                    ref={input}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                    hidden
                    data-testid="background-input"
                    onChange={(event) => void onFile(event)}
                />
            </div>
            {placement !== undefined && (
                <>
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                        <span>
                            {t('editor.zoom')}{' '}
                            <span className="font-mono font-normal">
                                {zoom}%
                            </span>
                        </span>
                        <input
                            type="range"
                            min={MIN_ZOOM * 100}
                            max={MAX_ZOOM * 100}
                            step={1}
                            value={zoom}
                            disabled={context === null}
                            onChange={(event) =>
                                act({
                                    type: 'zoom-to',
                                    scale: Number(event.target.value) / 100,
                                })
                            }
                            className="h-11 accent-ink"
                        />
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {(['left', 'up', 'down', 'right'] as const).map(
                            (direction) => (
                                <Button
                                    key={direction}
                                    variant="icon"
                                    aria-label={t(`editor.dir_${direction}`)}
                                    disabled={context === null}
                                    onClick={() =>
                                        act({ type: 'nudge', direction })
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
            {problem !== null && (
                <p role="alert" className="m-0 text-sm text-press">
                    {problem}
                </p>
            )}
        </div>
    );
}
