import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import {
    ChoiceRow,
    RangeField,
} from '@/features/edition/editor/panel/panel-parts';
import { useTranslation } from '@/hooks/use-translation';
import type { PhotoPlacement } from '@/lib/render/edition-types';
import type {
    PlacementAction,
    PlacementContext,
} from '@/lib/render/editor-placements';
import { MAX_ZOOM, minZoom } from '@/lib/render/photos-transform';

type PhotoAdjustProps = {
    placement: PhotoPlacement;
    context: PlacementContext | null;
    onAct: (action: PlacementAction, announcement?: string) => void;
};

export const PhotoZoom = ({ placement, context, onAct }: PhotoAdjustProps) => {
    const t = useTranslation();
    const zoomPercent = Math.round(placement.scale * 100);
    const minPercent = Math.round(
        minZoom({ fit: placement.fit === true }) * 100,
    );

    return (
        <div className="flex items-end gap-2">
            <Button
                variant="icon"
                aria-label={t('editor.zoom_out')}
                disabled={context === null}
                onClick={() =>
                    onAct(
                        { type: 'zoom-by', delta: -0.1 },
                        t('editor.zoom_announce', {
                            percent: Math.max(minPercent, zoomPercent - 10),
                        }),
                    )
                }
            >
                −
            </Button>
            <RangeField
                className="flex-1"
                label={t('editor.zoom')}
                shown={
                    <span className="font-mono font-normal">
                        {zoomPercent}%
                    </span>
                }
                min={minPercent}
                max={MAX_ZOOM * 100}
                value={zoomPercent}
                valueText={`${String(zoomPercent)}%`}
                disabled={context === null}
                onChange={(next) =>
                    onAct({ type: 'zoom-to', scale: next / 100 })
                }
            />
            <Button
                variant="icon"
                aria-label={t('editor.zoom_in')}
                disabled={context === null}
                onClick={() =>
                    onAct(
                        { type: 'zoom-by', delta: 0.1 },
                        t('editor.zoom_announce', {
                            percent: Math.min(MAX_ZOOM * 100, zoomPercent + 10),
                        }),
                    )
                }
            >
                +
            </Button>
        </div>
    );
};

export const PhotoTurn = ({ placement, context, onAct }: PhotoAdjustProps) => {
    const t = useTranslation();
    const grayscaleId = useId();

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button
                variant="secondary"
                disabled={context === null}
                onClick={() => onAct({ type: 'rotate', turns: 1 })}
            >
                <span aria-hidden="true">⟳</span>
                {t('editor.photo_rotate')}
            </Button>
            <Field
                orientation="horizontal"
                data-disabled={context === null}
                className="min-h-11 w-auto gap-2"
            >
                <Checkbox
                    id={grayscaleId}
                    checked={placement.grayscale}
                    disabled={context === null}
                    onCheckedChange={(checked) =>
                        onAct({ type: 'grayscale', on: checked === true })
                    }
                />
                <FieldLabel
                    htmlFor={grayscaleId}
                    className="text-base font-normal"
                >
                    {t('editor.grayscale')}
                </FieldLabel>
            </Field>
        </div>
    );
};

export const PhotoFit = ({ placement, onAct }: PhotoAdjustProps) => {
    const t = useTranslation();
    const fit = placement.fit === true;

    return (
        <>
            {/* Vullend / Passend (B168), also for a logo or photo in the board centre; the photo over the whole
            centre has its own tools. */}
            <ChoiceRow<'fill' | 'fit'>
                name={t('editor.photo_fit')}
                label={t('editor.photo_fit')}
                fields={{ fill: 'photo-fit' }}
                options={[
                    { id: 'fill', label: t('editor.photo_fit_fill') },
                    { id: 'fit', label: t('editor.photo_fit_fit') },
                ]}
                value={fit ? 'fit' : 'fill'}
                onChange={(next) =>
                    onAct(
                        { type: 'fit', on: next === 'fit' },
                        next === 'fit'
                            ? t('editor.photo_fit_announce_fit')
                            : t('editor.photo_fit_announce_fill'),
                    )
                }
            />
        </>
    );
};
