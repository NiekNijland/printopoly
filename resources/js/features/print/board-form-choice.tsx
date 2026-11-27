import { useId } from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTranslation } from '@/hooks/use-translation';
import type { BoardForm } from '@/types/generated';

const FORMS: readonly BoardForm[] = ['panels', 'whole'];

/**
 * "Hoe wil je het bord?" in the board row of the print-shop set (B243): stickers for the board you already own, or a
 * whole board in one piece. The same segmented bar as "Hoeveel geld?" (shadcn ToggleGroup, B195), so the print page
 * keeps one kind of choice. The line under it says what the chosen form is and who makes it.
 */
export const BoardFormChoice = ({
    value,
    onChange,
    disabled = false,
    size,
}: {
    value: BoardForm;
    onChange: (form: BoardForm) => void;
    disabled?: boolean;
    /** The size of the whole board, such as "50 × 50 cm". */
    size: string;
}) => {
    const t = useTranslation();
    const label = useId();

    return (
        <div className="flex min-w-0 flex-col gap-1">
            <div className="mb-1 flex min-h-8 items-center text-sm font-semibold">
                <span id={label}>{t('print.board_form.label')}</span>
            </div>
            <ToggleGroup
                type="single"
                variant="outline"
                aria-labelledby={label}
                disabled={disabled}
                value={value}
                onValueChange={(next) => {
                    // Clicking the chosen one again keeps it: one choice always stays selected.
                    const form = FORMS.find((candidate) => candidate === next);

                    if (form !== undefined) {
                        onChange(form);
                    }
                }}
                // The 2 px gap on ink is the line between the choices.
                className="grid w-full grid-cols-2 gap-0.5 bg-ink"
            >
                {FORMS.map((form) => (
                    <ToggleGroupItem
                        key={form}
                        value={form}
                        className="h-auto min-h-11 border-l-0 px-2 text-center text-sm leading-tight whitespace-normal"
                    >
                        {t(`print.board_form.${form}`)}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            <p className="m-0 text-sm text-ink-soft">
                {t(`print.board_form.${value}_note`, { size })}
            </p>
        </div>
    );
};
