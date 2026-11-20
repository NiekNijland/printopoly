import type { LayoutId } from '@/lib/edition/types';
import { cn } from '@/lib/utils';

interface LayoutTilesProps {
    layouts: readonly LayoutId[];
    value: LayoutId;
    onChange: (layout: LayoutId) => void;
    label: (layout: LayoutId) => string;
}

/** A little drawing of what the layout looks like: photo in a frame, photo over everything, or text only. */
function Miniature({ layout }: { layout: LayoutId }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'relative block h-10 w-8 border border-ink',
                layout === 'full' ? 'bg-board-photo' : 'bg-card',
            )}
        >
            {layout === 'frame' && (
                <span className="absolute inset-x-1 top-1 h-4 bg-board-photo" />
            )}
            {layout === 'full' && (
                <span className="absolute inset-x-1 bottom-1 h-3 bg-card" />
            )}
            {layout !== 'full' && (
                <>
                    <span
                        className={cn(
                            'absolute inset-x-1 h-px bg-ink',
                            layout === 'frame' ? 'bottom-3' : 'top-3',
                        )}
                    />
                    <span
                        className={cn(
                            'absolute inset-x-1 h-px bg-ink',
                            layout === 'frame' ? 'bottom-1.5' : 'top-5',
                        )}
                    />
                    {layout === 'text' && (
                        <span className="absolute inset-x-1 top-7 h-px bg-ink" />
                    )}
                </>
            )}
        </span>
    );
}

/** The layout choice as three tiles with a miniature (Editor.dc.html). */
export function LayoutTiles({
    layouts,
    value,
    onChange,
    label,
}: LayoutTilesProps) {
    return (
        <div
            role="radiogroup"
            className="grid gap-2"
            style={{
                gridTemplateColumns: `repeat(${layouts.length}, minmax(0, 1fr))`,
            }}
        >
            {layouts.map((id) => (
                <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={value === id}
                    onClick={() => onChange(id)}
                    className={cn(
                        'flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-control border-2 bg-card px-1 py-2 text-center text-sm font-semibold text-ink',
                        value === id
                            ? 'border-press shadow-[inset_0_0_0_1px_var(--color-press)]'
                            : 'border-ink',
                    )}
                >
                    <Miniature layout={id} />
                    <span>{label(id)}</span>
                </button>
            ))}
        </div>
    );
}
