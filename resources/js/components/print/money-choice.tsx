import { useId, type ReactNode } from 'react';

import { useTranslation } from '@/hooks/use-translation';
import { MONEY_AMOUNTS, type MoneyAmount } from '@/lib/print/money';
import { cn } from '@/lib/utils';

/**
 * "Hoeveel geld?" (B156): three amounts in one inked bar, like the set switch, in the money row of the print page
 * and under Onderdelen in the edition panel. Native radios, so arrow keys and a screen reader work as expected.
 */
export function MoneyChoice({
    value,
    onChange,
    disabled = false,
    aside,
}: {
    /** Null when nothing is chosen: the default of each set applies. */
    value: MoneyAmount | null;
    onChange: (amount: MoneyAmount) => void;
    disabled?: boolean;
    /** Next to the label, such as the "Standaard" button of the edition panel. */
    aside?: ReactNode;
}) {
    const t = useTranslation();
    const name = useId();

    return (
        <fieldset
            className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0"
            disabled={disabled}
        >
            <legend className="mb-1 flex min-h-8 w-full items-center justify-between gap-2 p-0 text-sm font-semibold">
                <span>{t('print.money.label')}</span>
                {aside}
            </legend>
            <div className="grid grid-cols-3 overflow-hidden rounded-control border-2 border-ink bg-card">
                {MONEY_AMOUNTS.map((amount) => (
                    <label
                        key={amount}
                        className={cn(
                            'flex min-h-11 cursor-pointer items-center justify-center px-2 text-center text-sm leading-tight font-semibold not-last:border-r-2 not-last:border-ink has-focus-visible:outline-2 has-focus-visible:-outline-offset-4 has-focus-visible:outline-press',
                            value === amount
                                ? 'bg-ink text-paper'
                                : 'bg-card text-ink hover:bg-paper',
                        )}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={amount}
                            checked={value === amount}
                            onChange={() => {
                                onChange(amount);
                            }}
                            className="sr-only"
                        />
                        {t(`print.money.${amount}`)}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
