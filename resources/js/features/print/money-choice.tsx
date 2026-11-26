import { useId, type ReactNode } from 'react';

import { WarningIcon } from '@/components/ui/icons';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTranslation } from '@/hooks/use-translation';
import { MONEY_AMOUNTS, type MoneyAmount } from '@/lib/render/print-money';
import { cn } from '@/lib/utils';

/**
 * "Hoeveel geld?" (B156): a segmented bar (shadcn ToggleGroup, B195, B196) in the money row of the print page and
 * in the edition panel. With `perSet` the bar starts with a choice that stands for the default of each set (null),
 * such as "Aanbevolen", which is selected while nothing is chosen, so one choice always looks selected. The same
 * words in both places (vindbaarheid §2): Aanbevolen, 2 tot 4 spelers, 5 tot 8 spelers, Volledige bank.
 */
export const MoneyChoice = ({
    value,
    onChange,
    disabled = false,
    aside,
    perSet,
    note,
    warn = false,
}: {
    /** Null when nothing is chosen: the default of each set applies. */
    value: MoneyAmount | null;
    onChange: (amount: MoneyAmount | null) => void;
    disabled?: boolean;
    /** Next to the label. */
    aside?: ReactNode;
    /** The label of a first choice that stands for the default of each set (null). */
    perSet?: string;
    /** A line under the bar, such as what the recommended amount is for this set. */
    note?: string;
    /** The note says the amount is too little for the pawns in the set (R5-29): it stands out. */
    warn?: boolean;
}) => {
    const t = useTranslation();
    const label = useId();
    const options: { id: MoneyAmount | null; label: string }[] = [
        ...(perSet === undefined ? [] : [{ id: null, label: perSet }]),
        ...MONEY_AMOUNTS.map((amount) => ({
            id: amount,
            label: t(`print.money.${amount}`),
        })),
    ];
    const valueOf = (amount: MoneyAmount | null): string => amount ?? 'per-set';

    return (
        <div className="flex min-w-0 flex-col gap-1">
            <div className="mb-1 flex min-h-8 w-full items-center justify-between gap-2 text-sm font-semibold">
                <span id={label}>{t('print.money.label')}</span>
                {aside}
            </div>
            {/* Four choices go two by two when narrow, so each label stays on its own lines. */}
            <div className="@container">
                <ToggleGroup
                    type="single"
                    variant="outline"
                    aria-labelledby={label}
                    disabled={disabled}
                    value={valueOf(value)}
                    onValueChange={(next) => {
                        // Clicking the chosen one again keeps it: one choice always stays selected.
                        if (next === '') {
                            return;
                        }
                        onChange(
                            options.find(
                                (option) => valueOf(option.id) === next,
                            )?.id ?? null,
                        );
                    }}
                    className={cn(
                        // The 2 px gaps on ink are the lines between the choices, also between two rows.
                        'grid w-full gap-0.5 bg-ink',
                        options.length === 4
                            ? 'grid-cols-2 @[24rem]:grid-cols-4'
                            : 'grid-cols-3',
                    )}
                >
                    {options.map((option) => (
                        <ToggleGroupItem
                            key={valueOf(option.id)}
                            value={valueOf(option.id)}
                            className="h-auto min-h-11 border-l-0 px-2 text-center text-sm leading-tight whitespace-normal"
                        >
                            {option.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>
            {note !== undefined &&
                (warn ? (
                    <p
                        role="status"
                        className="m-0 flex items-start gap-2 text-sm font-semibold text-ink"
                    >
                        <WarningIcon
                            size={18}
                            aria-hidden="true"
                            className="mt-0.5 flex-none text-press"
                        />
                        <span>{note}</span>
                    </p>
                ) : (
                    <p className="m-0 text-sm text-ink-soft">{note}</p>
                ))}
        </div>
    );
};
