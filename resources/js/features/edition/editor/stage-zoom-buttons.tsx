import { Button } from '@/components/ui/button';
import { FitIcon, MinusIcon, PlusIcon } from '@/components/ui/icons';
import { MAX_ZOOM, MIN_ZOOM } from '@/features/edition/editor/stage-view';
import { useTranslation } from '@/hooks/use-translation';

type StageZoomButtonsProps = {
    zoom: number;
    onStep: (direction: 1 | -1) => void;
    onFit: () => void;
};

export const StageZoomButtons = ({
    zoom,
    onStep,
    onFit,
}: StageZoomButtonsProps) => {
    const t = useTranslation();

    return (
        <div
            className="absolute right-3 bottom-3 z-20 flex items-center gap-0.5 rounded-full border-2 border-ink bg-paper p-0.5 shadow-[2px_2px_0_var(--color-ink)]"
            data-stage-zoom=""
            onPointerDown={(event) => event.stopPropagation()}
        >
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                aria-label={t('editor.view_zoom_out')}
                disabled={zoom <= MIN_ZOOM}
                onClick={() => onStep(-1)}
            >
                <MinusIcon size={18} />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 min-w-16 rounded-full px-2 text-sm tabular-nums min-[400px]:px-2"
                aria-label={t('editor.view_fit')}
                title={t('editor.view_fit')}
                onClick={onFit}
            >
                {zoom === 1 ? (
                    <FitIcon size={18} />
                ) : (
                    `${Math.round(zoom * 100)}%`
                )}
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                aria-label={t('editor.view_zoom_in')}
                disabled={zoom >= MAX_ZOOM}
                onClick={() => onStep(1)}
            >
                <PlusIcon size={18} />
            </Button>
        </div>
    );
};
