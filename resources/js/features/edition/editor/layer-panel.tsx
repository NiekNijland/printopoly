import { useRef, useSyncExternalStore, type ChangeEvent } from 'react';

import { WarningIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { LayerControls } from '@/features/edition/editor/layer-controls';
import { LayerList } from '@/features/edition/editor/layer-list';
import { FieldLabel } from '@/features/edition/editor/panel/panel-parts';
import { useLayerActions } from '@/features/edition/editor/use-layer-actions';
import type { EditionSession } from '@/features/edition/session';
import { useKeyboardHints } from '@/hooks/use-media-query';
import { useTranslation } from '@/hooks/use-translation';
import type { Edition, FreeLayer } from '@/lib/render/edition-types';
import { canAddLayer, type LayerArea } from '@/lib/render/editor-layers';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';

type LayerPanelProps = {
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
};

type AddLayerButtonsProps = {
    disabled: boolean;
    onText: () => void;
    onFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
};

const AddLayerButtons = ({
    disabled,
    onText,
    onFile,
}: AddLayerButtonsProps) => {
    const t = useTranslation();
    const fileInput = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-wrap gap-2">
            <Button
                variant="secondary"
                className="flex-1 basis-36"
                disabled={disabled}
                onClick={onText}
            >
                {t('editor.layer_add_text')}
            </Button>
            <Button
                variant="secondary"
                className="flex-1 basis-36"
                disabled={disabled}
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
    );
};

/** The "Lagen" section of the board centre, box lid and card backs (B42, B43, B93). */
export const LayerPanel = ({
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
}: LayerPanelProps) => {
    const t = useTranslation();
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);
    const hints = useKeyboardHints();
    const selected = layers.find((layer) => layer.id === selectedId);
    const { problem, change, addText, onFile, remove } = useLayerActions({
        session,
        edition,
        editKey,
        area,
        layers,
        onSelect,
        cache,
    });

    return (
        <div className="flex flex-col gap-4">
            <FieldLabel label={t('editor.layers_extra')} tag={tag} />
            <AddLayerButtons
                disabled={!canAddLayer(layers)}
                onText={addText}
                onFile={onFile}
            />
            {problem !== null && (
                <p
                    role="alert"
                    className="m-0 flex items-start gap-2 rounded-control border-2 border-press px-3 py-2 text-sm"
                >
                    <WarningIcon size={18} className="mt-0.5 shrink-0" />
                    <span>{problem}</span>
                </p>
            )}

            <LayerList
                layers={layers}
                selectedId={selectedId}
                photos={photos}
                title={title}
                onSelect={onSelect}
                onRemove={remove}
                onTitle={onTitle}
            />

            <LayerControls
                selected={selected}
                area={area}
                ink={ink}
                change={change}
            />
            <p className="m-0 text-xs text-ink-soft">
                {t('editor.layer_hint')}
                {hints && ` ${t('editor.layer_hint_keys')}`}
            </p>
        </div>
    );
};
