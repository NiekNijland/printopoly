import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import type { FreeLayer } from '@/lib/render/edition-types';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { cn } from '@/lib/utils';

const TITLE_LAYER = 'title';

/**
 * The preview in front of a layer in the list (R5-07, Anouk): the photo itself, small, so you see which photo the
 * layer is; a text layer shows "Aa" in its own colour and letter.
 */
const LayerTile = ({
    layer,
    photos,
}: {
    layer: FreeLayer;
    photos: PhotoInfos;
}) => {
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
};

type TitleRowProps = {
    title: string;
    selected: boolean;
    onChoose: () => void;
};

const TitleRow = ({ title, selected, onChoose }: TitleRowProps) => {
    const t = useTranslation();

    return (
        <li
            className={cn(
                'rounded-control',
                selected
                    ? 'bg-card shadow-[inset_4px_0_0_var(--color-press)]'
                    : 'hover:bg-card/60',
            )}
        >
            <button
                type="button"
                aria-current={selected}
                onClick={onChoose}
                className={cn(
                    'flex min-h-12 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-2 text-left text-base',
                    selected && 'font-semibold',
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
    );
};

type LayerListProps = {
    layers: readonly FreeLayer[];
    selectedId: string | null;
    photos: PhotoInfos;
    title: string | undefined;
    onSelect: (id: string | null) => void;
    onRemove: (id: string) => void;
    onTitle: (() => void) | undefined;
};

export const LayerList = ({
    layers,
    selectedId,
    photos,
    title,
    onSelect,
    onRemove,
    onTitle,
}: LayerListProps) => {
    const t = useTranslation();
    const label = (layer: FreeLayer): string =>
        layer.kind === 'text' ? layer.text : t('editor.layer_photo');

    return (
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
                            onClick={() => onRemove(layer.id)}
                        >
                            ✕
                        </Button>
                    </li>
                ))}
            {title !== undefined && (
                <TitleRow
                    title={title}
                    selected={selectedId === TITLE_LAYER}
                    onChoose={() => {
                        onSelect(TITLE_LAYER);
                        onTitle?.();
                    }}
                />
            )}
            <li className="flex min-h-12 items-center gap-3 px-2 text-base text-ink-soft">
                <span
                    aria-hidden="true"
                    className="size-9 shrink-0 rounded-control border border-dashed border-line-strong bg-board"
                />
                {t('editor.layer_background')}
            </li>
        </ul>
    );
};
