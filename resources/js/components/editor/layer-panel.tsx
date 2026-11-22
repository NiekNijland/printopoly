import { usePage } from '@inertiajs/react';
import { useRef, useState, type ChangeEvent } from 'react';

import { ChoiceRow, FieldLabel } from '@/components/editor/panel/panel-parts';
import { WarningIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useServices } from '@/hooks/use-editions';
import { useKeyboardHints } from '@/hooks/use-media-query';
import { useTranslation } from '@/hooks/use-translation';
import { BOARD_CENTER_KEY } from '@/lib/edition/keys';
import type { EditionSession } from '@/lib/edition/session';
import {
    LAYER_ALIGNS,
    LAYER_FONTS,
    type Edition,
    type FreeLayer,
    type LayerAlign,
    type LayerFont,
} from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import { ingestPhoto } from '@/lib/editor/ingest';
import {
    canAddLayer,
    newCenterLayerSpot,
    newPhotoLayer,
    newTextLayer,
    replaceLayer,
    rotateLayer,
    scaleLayer,
    type LayerArea,
} from '@/lib/editor/layers';
import type { PhotoCache } from '@/lib/editor/photo-cache';
import { startingPlacement } from '@/lib/editor/placements';
import { cn } from '@/lib/utils';

const TITLE_LAYER = 'title';

interface LayerPanelProps {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    area: LayerArea;
    layers: readonly FreeLayer[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    cache: PhotoCache;
    /** Name shown on the first row when the element has a title (the board centre). */
    title?: string;
    /** Where layers may not go, next to the label: "niet op de vouwlijnen en kaartvakken". */
    tag?: string;
    /** The ink of the theme: the colour of a text layer without one of its own. */
    ink?: string;
    /** Opens the controls of the title when its row is chosen (B170). */
    onTitle?: () => void;
}

type TextLayer = Extract<FreeLayer, { kind: 'text' }>;

/**
 * The letter, the alignment and the colour of a text layer (B169), so a line on the lid can match the photo. A
 * colour of its own has a "Standaard" button that goes back to the ink of the theme.
 */
function TextLook({
    layer,
    ink,
    onChange,
}: {
    layer: TextLayer;
    ink: string;
    onChange: (layer: TextLayer, group: string) => void;
}) {
    const t = useTranslation();
    const colorId = `layer-color-${layer.id}`;
    const without = <K extends 'color' | 'font' | 'align'>(
        field: K,
    ): TextLayer => {
        const next = { ...layer };
        delete next[field];

        return next;
    };

    return (
        <>
            <ChoiceRow<LayerFont>
                name={t('editor.layer_font')}
                label={t('editor.layer_font')}
                options={LAYER_FONTS.map((font) => ({
                    id: font,
                    label: t(`editor.layer_font_${font}`),
                }))}
                value={layer.font ?? 'heading'}
                onChange={(font) =>
                    onChange(
                        font === 'heading'
                            ? without('font')
                            : { ...layer, font },
                        `layer-look:${layer.id}`,
                    )
                }
            />
            <ChoiceRow<LayerAlign>
                name={t('editor.layer_align')}
                label={t('editor.layer_align')}
                options={LAYER_ALIGNS.map((align) => ({
                    id: align,
                    label: t(`editor.layer_align_${align}`),
                }))}
                value={layer.align ?? 'center'}
                onChange={(align) =>
                    onChange(
                        align === 'center'
                            ? without('align')
                            : { ...layer, align },
                        `layer-look:${layer.id}`,
                    )
                }
            />
            <div className="flex flex-col gap-1">
                <FieldLabel
                    htmlFor={colorId}
                    label={t('editor.layer_color')}
                    onStandard={
                        layer.color === undefined
                            ? undefined
                            : () =>
                                  onChange(
                                      without('color'),
                                      `layer-look:${layer.id}`,
                                  )
                    }
                />
                <div className="flex items-center gap-3">
                    <input
                        id={colorId}
                        type="color"
                        value={(layer.color ?? ink).toLowerCase()}
                        onChange={(event) =>
                            onChange(
                                {
                                    ...layer,
                                    color: event.target.value.toUpperCase(),
                                },
                                `layer-color:${layer.id}`,
                            )
                        }
                        className="h-12 w-16 cursor-pointer rounded-control border-2 border-ink bg-card p-1"
                    />
                    <span className="font-mono text-sm">
                        {(layer.color ?? ink).toUpperCase()}
                    </span>
                </div>
            </div>
        </>
    );
}

/** The "Lagen" section of the board centre, box lid and card backs (B42, B43, B93). */
export function LayerPanel({
    session,
    edition,
    editKey,
    area,
    layers,
    selectedId,
    onSelect,
    cache,
    title,
    tag,
    ink = '#1B1F24',
    onTitle,
}: LayerPanelProps) {
    const t = useTranslation();
    const hints = useKeyboardHints();
    const { locale } = usePage().props;
    const { repository } = useServices();
    const fileInput = useRef<HTMLInputElement>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const selected = layers.find((layer) => layer.id === selectedId);

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

    // On the board centre a new layer starts in the free square the title does not use, clear of the folds (B187).
    const spot =
        editKey === BOARD_CENTER_KEY
            ? newCenterLayerSpot(
                  edition.boardProfile,
                  edition.elements[editKey]?.centerPlace ?? 'topRight',
              )
            : undefined;

    const addText = (): void => {
        const layer = newTextLayer(
            layers,
            area,
            t('editor.layer_new_text'),
            spot,
        );
        write([...layers, layer]);
        onSelect(layer.id);
    };

    const onFile = async (
        event: ChangeEvent<HTMLInputElement>,
    ): Promise<void> => {
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
        const current = session.edition.elements[editKey]?.layers ?? [];
        const layer = newPhotoLayer(
            current,
            area,
            startingPlacement(result.record.id, result.record),
            spot,
        );
        write([...current, layer]);
        onSelect(layer.id);
    };

    const label = (layer: FreeLayer): string =>
        layer.kind === 'text'
            ? `${t('editor.layer_text')}: ${layer.text}`
            : t('editor.layer_photo');

    return (
        <div className="flex flex-col gap-4">
            <FieldLabel label={t('editor.layers_extra')} tag={tag} />
            <div className="flex flex-wrap gap-2">
                <Button
                    variant="secondary"
                    className="flex-1 basis-36"
                    disabled={!canAddLayer(layers)}
                    onClick={addText}
                >
                    {t('editor.layer_add_text')}
                </Button>
                <Button
                    variant="secondary"
                    className="flex-1 basis-36"
                    disabled={!canAddLayer(layers)}
                    onClick={() => fileInput.current?.click()}
                >
                    {t('editor.layer_add_photo')}
                </Button>
                <input
                    ref={fileInput}
                    type="file"
                    hidden
                    data-testid="layer-photo-input"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                    onChange={(event) => void onFile(event)}
                />
            </div>
            {problem !== null && (
                <p
                    role="alert"
                    className="m-0 flex items-start gap-2 rounded-control border-2 border-press px-3 py-2 text-sm"
                >
                    <WarningIcon size={18} className="mt-0.5 shrink-0" />
                    <span>{problem}</span>
                </p>
            )}

            <ul className="m-0 list-none border-t border-line p-0">
                {layers
                    .slice()
                    .reverse()
                    .map((layer) => (
                        <li
                            key={layer.id}
                            className="flex items-center border-b border-line"
                        >
                            <button
                                type="button"
                                aria-current={layer.id === selectedId}
                                onClick={() => onSelect(layer.id)}
                                className={cn(
                                    'min-h-12 flex-1 cursor-pointer truncate border-0 bg-transparent px-2 text-left text-base',
                                    layer.id === selectedId && 'font-semibold',
                                )}
                            >
                                {label(layer)}
                            </button>
                            {layer.id === selectedId && (
                                <span className="text-sm text-ink-soft">
                                    {t('editor.layer_chosen')}
                                </span>
                            )}
                            <Button
                                variant="icon"
                                aria-label={t('editor.layer_remove')}
                                onClick={() => {
                                    write(
                                        layers.filter(
                                            (item) => item.id !== layer.id,
                                        ),
                                    );
                                    onSelect(null);
                                }}
                            >
                                ✕
                            </Button>
                        </li>
                    ))}
                {title !== undefined && (
                    <li className="border-b border-line">
                        <button
                            type="button"
                            aria-current={selectedId === TITLE_LAYER}
                            onClick={() => {
                                onSelect(TITLE_LAYER);
                                onTitle?.();
                            }}
                            className={cn(
                                'flex min-h-12 w-full cursor-pointer items-center border-0 bg-transparent px-2 text-left text-base',
                                selectedId === TITLE_LAYER && 'font-semibold',
                            )}
                        >
                            <span className="flex-1 truncate">
                                {t('editor.layer_title')}: {title}
                            </span>
                            {selectedId === TITLE_LAYER && (
                                <span className="text-sm font-normal text-ink-soft">
                                    {t('editor.layer_chosen')}
                                </span>
                            )}
                        </button>
                    </li>
                )}
                <li className="flex min-h-12 items-center border-b border-line px-2 text-base">
                    {t('editor.layer_background')}
                </li>
            </ul>

            {selected?.kind === 'text' && (
                <>
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                        {t('editor.layer_text')}
                        <Textarea
                            rows={3}
                            value={selected.text}
                            onChange={(event) =>
                                change(
                                    { ...selected, text: event.target.value },
                                    `layer-text:${selected.id}`,
                                )
                            }
                        />
                    </label>
                    <TextLook
                        layer={selected}
                        ink={ink}
                        onChange={(next, group) => change(next, group)}
                    />
                </>
            )}
            {selected !== undefined && (
                <>
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                        <span>
                            {t('editor.layer_size')}{' '}
                            <span className="font-mono font-normal">
                                {Math.round(selected.w)} mm
                            </span>
                        </span>
                        <input
                            type="range"
                            min={6}
                            max={Math.round(Math.max(area.w, area.h))}
                            value={Math.round(selected.w)}
                            onChange={(event) =>
                                change(
                                    scaleLayer(
                                        selected,
                                        Number(event.target.value) / selected.w,
                                        area,
                                    ),
                                    `layer:${selected.id}`,
                                )
                            }
                            className="h-11 accent-ink"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                        <span>
                            {t('editor.layer_turn')}{' '}
                            <span className="font-mono font-normal">
                                {selected.rotation ?? 0}°
                            </span>
                        </span>
                        <input
                            type="range"
                            min={-180}
                            max={180}
                            value={selected.rotation ?? 0}
                            onChange={(event) =>
                                change(
                                    rotateLayer(
                                        selected,
                                        Number(event.target.value),
                                    ),
                                    `layer:${selected.id}`,
                                )
                            }
                            className="h-11 accent-ink"
                        />
                    </label>
                    {selected.kind === 'photo' && (
                        <label className="flex min-h-11 items-center gap-2 text-base">
                            <input
                                type="checkbox"
                                className="size-5 accent-ink"
                                checked={selected.photo.grayscale}
                                onChange={(event) =>
                                    change(
                                        {
                                            ...selected,
                                            photo: {
                                                ...selected.photo,
                                                grayscale: event.target.checked,
                                            },
                                        },
                                        `layer-photo:${selected.id}`,
                                    )
                                }
                            />
                            {t('editor.grayscale')}
                        </label>
                    )}
                </>
            )}
            <p className="m-0 text-xs text-ink-soft">
                {t('editor.layer_hint')}
                {hints && ` ${t('editor.layer_hint_keys')}`}
            </p>
        </div>
    );
}
