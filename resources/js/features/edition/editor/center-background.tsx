import { useRef, type ChangeEvent, type RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { editElement } from '@/features/edition/editor/edit';
import { RangeField } from '@/features/edition/editor/panel/panel-parts';
import { usePhotoPick } from '@/features/edition/editor/use-layer-actions';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { CENTER_PHOTO_BLEED } from '@/lib/render/center-layout';
import type { Edition, ElementOverride } from '@/lib/render/edition-types';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import {
    actOnPlacement,
    placementQuality,
    startingPlacement,
    type PlacementAction,
    type PlacementContext,
} from '@/lib/render/editor-placements';
import {
    placementTarget,
    resolutionLabel,
} from '@/lib/render/photos-resolution';
import { MAX_ZOOM, MIN_ZOOM } from '@/lib/render/photos-transform';
import { centerRect } from '@/lib/render/print-board';
import type { Locale } from '@/types/game';

type CenterBackgroundProps = {
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
};

const ARROWS = {
    left: '←',
    up: '↑',
    down: '↓',
    right: '→',
} as const;

const backgroundContext = (
    info: { width: number; height: number } | undefined,
    centre: { w: number; h: number },
): PlacementContext | null =>
    info === undefined
        ? null
        : {
              source: { w: info.width, h: info.height },
              frame: { w: centre.w, h: centre.h },
              // The photo reaches past the centre, as the home stickers print it (R5-03).
              bleed: CENTER_PHOTO_BLEED,
          };

const useBackgroundUpload = ({
    session,
    edition,
    editKey,
    cache,
    locale,
}: Pick<
    CenterBackgroundProps,
    'session' | 'edition' | 'editKey' | 'cache' | 'locale'
>) => {
    const { problem, pick } = usePhotoPick(edition.id, cache, locale);
    const centre = centerRect(edition.boardProfile);

    const onFile = (event: ChangeEvent<HTMLInputElement>) =>
        pick(event, (record) => {
            // One photo per centre (B187): a new photo over the whole centre takes the place of the one above the name.
            editElement(session, editKey, {
                background: startingPlacement(
                    record.id,
                    record,
                    placementTarget(
                        { w: centre.w, h: centre.h },
                        CENTER_PHOTO_BLEED,
                    ),
                    true,
                ),
                photo: undefined,
                centerMode: undefined,
            });
        });

    return { problem, onFile };
};

const BackgroundTools = ({
    session,
    editKey,
    placement,
    context,
    locale,
}: {
    session: EditionSession;
    editKey: string;
    placement: NonNullable<ElementOverride['background']>;
    context: PlacementContext | null;
    locale: Locale;
}) => {
    const t = useTranslation();
    const disabled = context === null;
    const act = (action: PlacementAction): void => {
        if (context === null) {
            return;
        }
        editElement(
            session,
            editKey,
            { background: actOnPlacement(placement, context, action) },
            `background:${editKey}`,
        );
    };

    const zoom = Math.round(placement.scale * 100);
    const quality =
        context !== null ? placementQuality(placement, context) : null;

    return (
        <>
            <RangeField
                label={t('editor.zoom')}
                shown={<span className="font-mono font-normal">{zoom}%</span>}
                min={MIN_ZOOM * 100}
                max={MAX_ZOOM * 100}
                value={zoom}
                valueText={`${String(zoom)}%`}
                disabled={disabled}
                onChange={(next) => act({ type: 'zoom-to', scale: next / 100 })}
            />
            <div className="flex flex-wrap gap-2">
                {(['left', 'up', 'down', 'right'] as const).map((direction) => (
                    <Button
                        key={direction}
                        variant="icon"
                        aria-label={t(`editor.dir_${direction}`)}
                        disabled={disabled}
                        onClick={() =>
                            act({
                                type: 'nudge',
                                direction,
                            })
                        }
                    >
                        {ARROWS[direction]}
                    </Button>
                ))}
            </div>
            {quality !== null && (
                <p
                    className="m-0 text-sm text-ink-soft"
                    data-testid="photo-resolution"
                >
                    {resolutionLabel(quality, locale)}{' '}
                    <span className="font-mono text-xs">
                        {t('editor.photo_ppi', {
                            ppi: Math.round(quality.dpi),
                        })}
                    </span>
                </p>
            )}
        </>
    );
};

/**
 * The photo over the whole board centre (B125): choose, zoom and move. It is the photo of the layout "Foto over het
 * hele midden" in the Afbeelding section (B187); another layout takes the same photo along.
 */
export const CenterBackground = ({
    session,
    edition,
    editKey,
    override,
    cache,
    locale,
    inputRef,
    fieldOnly = false,
}: CenterBackgroundProps) => {
    const t = useTranslation();
    const ownInput = useRef<HTMLInputElement>(null);
    const input = inputRef ?? ownInput;
    const placement = override?.background;
    const info =
        placement === undefined
            ? undefined
            : cache.getSnapshot().get(placement.photoId);
    const centre = centerRect(edition.boardProfile);
    const { problem, onFile } = useBackgroundUpload({
        session,
        edition,
        editKey,
        cache,
        locale,
    });
    const context = backgroundContext(info, centre);

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
                        <BackgroundTools
                            session={session}
                            editKey={editKey}
                            placement={placement}
                            context={context}
                            locale={locale}
                        />
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
};
