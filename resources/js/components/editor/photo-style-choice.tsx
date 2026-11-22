import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTranslation } from '@/hooks/use-translation';
import type { PhotoStyle } from '@/lib/render/photo';

interface PhotoStyleChoiceProps {
    value: PhotoStyle;
    onChange: (style: PhotoStyle) => void;
}

/** Small drawing of the two options: a photo in a frame, or a photo over the whole space with a name band. */
function Miniature({ style }: { style: PhotoStyle }) {
    return (
        <svg
            viewBox="0 0 30 40"
            className="h-14 w-10 shrink-0"
            aria-hidden="true"
            data-miniature={style}
        >
            <rect
                x="0.75"
                y="0.75"
                width="28.5"
                height="38.5"
                rx="1.5"
                fill="var(--color-card)"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            {style === 'framed' ? (
                <>
                    <rect
                        x="4"
                        y="4"
                        width="22"
                        height="5"
                        fill="currentColor"
                        opacity="0.25"
                    />
                    <rect
                        x="4"
                        y="12"
                        width="22"
                        height="16"
                        fill="currentColor"
                        opacity="0.55"
                    />
                    <rect
                        x="4"
                        y="31"
                        width="22"
                        height="2"
                        fill="currentColor"
                        opacity="0.25"
                    />
                    <rect
                        x="8"
                        y="35"
                        width="14"
                        height="1.6"
                        fill="currentColor"
                        opacity="0.25"
                    />
                </>
            ) : (
                <>
                    <rect
                        x="0.75"
                        y="9"
                        width="28.5"
                        height="30.25"
                        fill="currentColor"
                        opacity="0.55"
                    />
                    <rect
                        x="0.75"
                        y="9"
                        width="28.5"
                        height="8"
                        fill="var(--color-card)"
                        opacity="0.9"
                    />
                    <rect
                        x="6"
                        y="11.5"
                        width="18"
                        height="3"
                        fill="currentColor"
                        opacity="0.5"
                    />
                    <rect
                        x="0.75"
                        y="29"
                        width="28.5"
                        height="10.25"
                        fill="currentColor"
                        opacity="0.35"
                    />
                    <rect
                        x="9"
                        y="33.5"
                        width="12"
                        height="2"
                        fill="var(--color-card)"
                    />
                </>
            )}
        </svg>
    );
}

/**
 * The choice between "In kader" and "Hele vak" for an element that has a photo (B124): shadcn's ToggleGroup with
 * two tiles that show a small drawing of each (B196). The arrow keys move, Space or Enter chooses.
 */
export function PhotoStyleChoice({ value, onChange }: PhotoStyleChoiceProps) {
    const t = useTranslation();
    const options: { id: PhotoStyle; label: string }[] = [
        { id: 'framed', label: t('editor.photo_style_framed') },
        { id: 'full', label: t('editor.photo_style_full') },
    ];

    return (
        <ToggleGroup
            type="single"
            variant="outline"
            value={value}
            onValueChange={(next) => {
                if (next !== '') {
                    onChange(next as PhotoStyle);
                }
            }}
            aria-label={t('editor.photo_style')}
            className="grid w-full grid-cols-2"
            data-field="photo-style"
        >
            {options.map((option) => (
                <ToggleGroupItem
                    key={option.id}
                    value={option.id}
                    className="h-auto w-full justify-start gap-3 p-2 text-left"
                >
                    <Miniature style={option.id} />
                    <span>{option.label}</span>
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
