import { useId, type ReactNode } from 'react';

import { useTranslation } from '@/hooks/use-translation';
import { MONEY_AMOUNTS, type MoneyAmount } from '@/lib/print/money';
import { cn } from '@/lib/utils';

/**
 * "Hoeveel geld?" (B156): three amounts in one inked bar, like the set switch, in the money row of the print page
 * and under Onderdelen in the edition panel. Native radios, so arrow keys and a screen reader work as expected.
 * With `perSet` the bar starts with "Per set", which is selected while nothing is chosen, so one choice always
 * looks selected.
 */
export function MoneyChoice({
    value,
    onChange,
    disabled = false,
    aside,
    perSet,
}: {
    /** Null when nothing is chosen: the default of each set applies. */
    value: MoneyAmount | null;
    onChange: (amount: MoneyAmount | null) => void;
    disabled?: boolean;
    /** Next to the label. */
    aside?: ReactNode;
    /** The label of a first choice that stands for the default of each set (null). */
    perSet?: string;
}) {
    const t = useTranslation();
    const name = useId();
    const options: { id: MoneyAmount | null; label: string }[] = [
        ...(perSet === undefined ? [] : [{ id: null, label: perSet }]),
        ...MONEY_AMOUNTS.map((amount) => ({
            id: amount,
            label: t(`print.money.${amount}`),
        })),
    ];

    return (
        <fieldset
            className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0"
            disabled={disabled}
        >
            <legend className="mb-1 flex min-h-8 w-full items-center justify-between gap-2 p-0 text-sm font-semibold">
                <span>{t('print.money.label')}</span>
                {aside}
            </legend>
            {/* The 2 px gaps on ink are the lines between the choices; four choices go two by two when narrow. */}
            <div className="@container">
                <div
                    className={cn(
                        'grid gap-0.5 overflow-hidden rounded-control border-2 border-ink bg-ink',
                        options.length === 4
                            ? 'grid-cols-2 @[18rem]:grid-cols-4'
                            : 'grid-cols-3',
                    )}
                >
                    {options.map(({ id: amount, label }) => (
                        <label
                            key={amount ?? 'per-set'}
                            className={cn(
                                'flex min-h-11 cursor-pointer items-center justify-center px-2 text-center text-sm leading-tight font-semibold has-focus-visible:outline-2 has-focus-visible:-outline-offset-4 has-focus-visible:outline-press',
                                value === amount
                                    ? 'bg-ink text-paper'
                                    : 'bg-card text-ink hover:bg-paper',
                            )}
                        >
                            <input
                                type="radio"
                                name={name}
                                value={amount ?? 'per-set'}
                                checked={value === amount}
                                onChange={() => {
                                    onChange(amount);
                                }}
                                className="sr-only"
                            />
                            {label}
                        </label>
                    ))}
                </div>
            </div>
        </fieldset>
    );
}
