import { usePage } from '@inertiajs/react';
import {
    useRef,
    useState,
    useSyncExternalStore,
    type ChangeEvent,
} from 'react';

import { Button } from '@/components/ui/button';
import { WarningIcon } from '@/components/ui/icons';
import { Textarea } from '@/components/ui/textarea';
import { editElement } from '@/features/edition/editor/edit';
import { ingestPhoto } from '@/features/edition/editor/ingest';
import {
    CheckField,
    ChoiceRow,
    FieldLabel,
    RangeField,
} from '@/features/edition/editor/panel/panel-parts';
import type { EditionSession } from '@/features/edition/session';
import { useServices } from '@/features/edition/use-editions';
import { useKeyboardHints } from '@/hooks/use-media-query';
import { useTranslation } from '@/hooks/use-translation';
import { BOARD_CENTER_KEY } from '@/lib/render/edition-keys';
import { resolveEdition } from '@/lib/render/edition-resolve';
import {
    LAYER_ALIGNS,
    LAYER_FONTS,
    type Edition,
    type FreeLayer,
    type LayerAlign,
    type LayerFont,
} from '@/lib/render/edition-types';
import {
    canAddLayer,
    newCenterLayerSpot,
    newPhotoLayer,
    newTextLayer,
    placeNewCenterLayer,
    replaceLayer,
    rotateLayer,
    scaleLayer,
    type LayerArea,
} from '@/lib/render/editor-layers';
import type { PhotoCache, PhotoInfos } from '@/lib/render/editor-photo-cache';
import { startingPlacement } from '@/lib/render/editor-placements';
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
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);
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

    // On the board centre a new layer goes where it hides nothing: not on the name, the photo or another layer (R5-07).
    const placed = (layer: FreeLayer, current: readonly FreeLayer[]) =>
        editKey === BOARD_CENTER_KEY
            ? placeNewCenterLayer(
                  layer,
                  session.edition,
                  resolveEdition(session.edition).boardCenter,
                  current,
              )
            : layer;

    const addText = (): void => {
        const layer = placed(
            newTextLayer(layers, area, t('editor.layer_new_text'), spot),
            layers,
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
        const layer = placed(
            newPhotoLayer(
                current,
                area,
                startingPlacement(result.record.id, result.record),
                spot,
            ),
            current,
        );
        write([...current, layer]);
        onSelect(layer.id);
    };

    const label = (layer: FreeLayer): string =>
        layer.kind === 'text' ? layer.text : t('editor.layer_photo');

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

            <ul className="m-0 flex list-none flex-col gap-1 border-t border-line p-0 pt-2">
                {layers
                    .slice()
                    .reverse()
                    .map((layer) => (
                        <li
                            key={layer.id}
                            data-layer-row={layer.kind}
                            className={cn(
                                'flex items-center rounded-control pr-1',
                                layer.id === selectedId
                                    ? 'bg-card shadow-[inset_4px_0_0_var(--color-press)]'
                                    : 'hover:bg-card/60',
                            )}
                        >
                            <button
                                type="button"
                                aria-current={layer.id === selectedId}
                                onClick={() => onSelect(layer.id)}
                                className={cn(
                                    'flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent px-2 text-left text-base',
                                    layer.id === selectedId && 'font-semibold',
                                )}
                            >
                                <LayerTile layer={layer} photos={photos} />
                                <span className="min-w-0 flex-1 truncate">
                                    {label(layer)}
                                </span>
                            </button>
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
                    <li
                        className={cn(
                            'rounded-control',
                            selectedId === TITLE_LAYER
                                ? 'bg-card shadow-[inset_4px_0_0_var(--color-press)]'
                                : 'hover:bg-card/60',
                        )}
                    >
                        <button
                            type="button"
                            aria-current={selectedId === TITLE_LAYER}
                            onClick={() => {
                                onSelect(TITLE_LAYER);
                                onTitle?.();
                            }}
                            className={cn(
                                'flex min-h-12 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-2 text-left text-base',
                                selectedId === TITLE_LAYER && 'font-semibold',
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className="flex size-9 shrink-0 items-center justify-center rounded-control border border-line-strong bg-paper"
                            >
                                <span className="h-2 w-6 -rotate-12 rounded-full bg-press" />
                            </span>
                            <span className="flex-1 truncate">
                                {t('editor.layer_title')}: {title}
                            </span>
                        </button>
                    </li>
                )}
                <li className="flex min-h-12 items-center gap-3 px-2 text-base text-ink-soft">
                    <span
                        aria-hidden="true"
                        className="size-9 shrink-0 rounded-control border border-dashed border-line-strong bg-board"
                    />
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
                    <RangeField
                        label={t('editor.layer_size')}
                        shown={
                            <span className="font-mono font-normal">
                                {Math.round(selected.w)} mm
                            </span>
                        }
                        min={6}
                        max={Math.round(Math.max(area.w, area.h))}
                        value={Math.round(selected.w)}
                        valueText={`${String(Math.round(selected.w))} mm`}
                        onChange={(next) =>
                            change(
                                scaleLayer(selected, next / selected.w, area),
                                `layer:${selected.id}`,
                            )
                        }
                    />
                    <RangeField
                        label={t('editor.layer_turn')}
                        shown={
                            <span className="font-mono font-normal">
                                {selected.rotation ?? 0}°
                            </span>
                        }
                        min={-180}
                        max={180}
                        value={selected.rotation ?? 0}
                        valueText={`${String(selected.rotation ?? 0)}°`}
                        onChange={(next) =>
                            change(
                                rotateLayer(selected, next),
                                `layer:${selected.id}`,
                            )
                        }
                    />
                    {selected.kind === 'photo' && (
                        <CheckField
                            label={t('editor.grayscale')}
                            checked={selected.photo.grayscale}
                            onCheckedChange={(checked) =>
                                change(
                                    {
                                        ...selected,
                                        photo: {
                                            ...selected.photo,
                                            grayscale: checked,
                                        },
                                    },
                                    `layer-photo:${selected.id}`,
                                )
                            }
                        />
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

/**
 * The preview in front of a layer in the list (R5-07, Anouk): the photo itself, small, so you see which photo the
 * layer is; a text layer shows "Aa" in its own colour and letter.
 */
function LayerTile({
    layer,
    photos,
}: {
    layer: FreeLayer;
    photos: PhotoInfos;
}) {
    if (layer.kind === 'photo') {
        const url = photos.get(layer.photo.photoId)?.url;

        return (
            <span
                aria-hidden="true"
                data-layer-preview
                className="size-9 shrink-0 overflow-hidden rounded-control border border-line-strong bg-table"
            >
                {url !== undefined && (
                    <img
                        src={url}
                        alt=""
                        className="size-full object-cover"
                        style={{
                            filter: layer.photo.grayscale
                                ? 'grayscale(1)'
                                : undefined,
                        }}
                    />
                )}
            </span>
        );
    }

    return (
        <span
            aria-hidden="true"
            className={cn(
                'font-bold flex size-9 shrink-0 items-center justify-center rounded-control border border-line-strong bg-paper text-base',
                layer.font === 'mono'
                    ? 'font-mono'
                    : layer.font === 'body'
                      ? 'font-sans'
                      : 'font-display',
            )}
            style={{ color: layer.color }}
        >
            Aa
        </span>
    );
}
