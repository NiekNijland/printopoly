import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/use-translation';
import {
    amountFields,
    amountRange,
    clampAmount,
    type AmountField,
} from '@/lib/edition/amounts';
import { spaceKey } from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import { formatMoney } from '@/lib/game/standard-edition';
import type { Space } from '@/lib/game/types';
import { cn } from '@/lib/utils';

interface AmountInputProps {
    id: string;
    label: string;
    /** The standard amount (a positive number, also for money a player pays). */
    standard: number;
    /** The amount the edition has now. */
    value: number;
    /** Called with a valid amount; `standard` brings the field back to the standard value. */
    onChange: (amount: number) => void;
    /** Shows the standard amount with the currency, e.g. `€ 60`. */
    format: (amount: number) => string;
    /** Problem the Controle found, shown under the field. */
    problem?: string;
}

/**
 * A number field for one amount (B132): it shows the allowed range, has steppers, and the standard value with a
 * link to put it back. A value outside the range is not applied; the field says so and goes back on blur.
 */
export function AmountInput({
    id,
    label,
    standard,
    value,
    onChange,
    format,
    problem,
}: AmountInputProps) {
    const t = useTranslation();
    const { min, max } = amountRange(standard);
    const [draft, setDraft] = useState<string | null>(null);
    const shown = draft ?? String(value);
    const typed = shown.trim() === '' ? NaN : Number(shown);
    const invalid =
        draft !== null &&
        !(Number.isInteger(typed) && typed >= min && typed <= max);
    const fixed = min === max;
    const step = (direction: 1 | -1): void => {
        setDraft(null);
        onChange(clampAmount(value + direction, standard));
    };

    return (
        <div className="flex flex-col gap-1">
            <label
                htmlFor={id}
                className="flex flex-col gap-1 text-sm font-semibold"
            >
                {label}
            </label>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    aria-label={t('editor.amount_lower', { name: label })}
                    disabled={fixed || value <= min}
                    onClick={() => step(-1)}
                    className="size-12 shrink-0 cursor-pointer rounded-control border-2 border-ink bg-card text-xl font-semibold disabled:cursor-default disabled:opacity-40"
                >
                    −
                </button>
                <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    step={1}
                    value={shown}
                    disabled={fixed}
                    aria-invalid={invalid || problem !== undefined}
                    aria-describedby={`${id}-hint`}
                    className="text-center"
                    onBlur={() => setDraft(null)}
                    onChange={(event) => {
                        const next = event.target.value;
                        setDraft(next);
                        const number = Number(next);
                        if (
                            next.trim() !== '' &&
                            Number.isInteger(number) &&
                            number >= min &&
                            number <= max
                        ) {
                            onChange(number);
                        }
                    }}
                />
                <button
                    type="button"
                    aria-label={t('editor.amount_higher', { name: label })}
                    disabled={fixed || value >= max}
                    onClick={() => step(1)}
                    className="size-12 shrink-0 cursor-pointer rounded-control border-2 border-ink bg-card text-xl font-semibold disabled:cursor-default disabled:opacity-40"
                >
                    +
                </button>
            </div>
            <div
                id={`${id}-hint`}
                className="flex flex-wrap items-center gap-x-3 text-xs font-normal text-ink-soft"
            >
                <span className={cn(invalid && 'font-semibold text-press')}>
                    {invalid
                        ? t('editor.amount_invalid', { min, max })
                        : t('editor.amount_between', { min, max })}
                </span>
                <span>
                    {t('editor.amount_standard', {
                        value: format(standard),
                    })}
                </span>
                <button
                    type="button"
                    disabled={value === standard}
                    onClick={() => {
                        setDraft(null);
                        onChange(standard);
                    }}
                    className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-ink underline underline-offset-4 disabled:cursor-default disabled:opacity-40"
                >
                    {t('editor.restore')}
                </button>
            </div>
            {problem !== undefined && (
                <p role="alert" className="m-0 text-sm text-press">
                    {problem}
                </p>
            )}
        </div>
    );
}

/** The label of one amount of a space, in the words of the edition (houses, hotels). */
function labelOf(
    field: AmountField,
    space: Space,
    resolved: ResolvedEdition,
    t: ReturnType<typeof useTranslation>,
): string {
    const { id } = field;
    if (id === 'price') return t('editor.amount_price');
    if (id === 'mortgage') return t('editor.amount_mortgage');
    if (id === 'houseCost') return t('editor.amount_house_cost');
    if (id === 'amount') return t('editor.amount_tax');
    if (id === 'salary') return t('editor.amount_salary');
    const index = Number(id.split('.')[1]);
    if (space.type === 'station') {
        return t('editor.amount_rent_stations', { n: index + 1 });
    }
    if (index === 0) return t('editor.amount_rent');
    if (index === 5) {
        return t('editor.amount_rent_hotel', {
            hotel: resolved.words.hotel.singular,
        });
    }
    const house =
        index === 1
            ? resolved.words.house.singular
            : resolved.words.house.plural;

    return t('editor.amount_rent_houses', { n: index, house });
}

interface SpaceAmountsProps {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    space: Space;
    /** Messages of the Controle by field id, such as `price`. */
    problems?: Readonly<Record<string, string>>;
}

/** Every amount of a space as a number field (B132): price, rents, building cost, mortgage, tax or salary. */
export function SpaceAmounts({
    session,
    edition,
    resolved,
    space,
    problems = {},
}: SpaceAmountsProps) {
    const t = useTranslation();
    const fields = amountFields(space);
    const key = spaceKey(space.position);
    const own = edition.elements[key]?.amounts;

    if (fields.length === 0) {
        return null;
    }

    const format = (amount: number): string =>
        formatMoney(
            amount,
            resolved.currency.id,
            resolved.language,
            resolved.words.customSymbol,
        );
    const set = (field: AmountField, amount: number): void => {
        const next = { ...own };
        if (amount === field.standard) {
            delete next[field.id];
        } else {
            next[field.id] = amount;
        }
        editElement(
            session,
            key,
            { amounts: Object.keys(next).length === 0 ? undefined : next },
            `amounts:${key}:${field.id}`,
        );
    };

    const changed = own !== undefined && Object.keys(own).length > 0;

    // The amounts sit in one folding section, like the colour of a group: a street has nine of them.
    return (
        <details className="flex flex-col gap-3" open={changed}>
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <span className="flex-1 font-semibold">
                    {t('editor.amounts_title')}
                </span>
                <span className="text-ink-soft">
                    {fields[0] === undefined
                        ? ''
                        : format(
                              clampAmount(
                                  own?.[fields[0].id] ?? fields[0].standard,
                                  fields[0].standard,
                              ),
                          )}
                </span>
            </summary>
            <fieldset className="m-0 mt-2 flex flex-col gap-3 border-0 p-0">
                <legend className="sr-only">{t('editor.amounts_title')}</legend>
                <p className="m-0 text-xs text-ink-soft">
                    {t('editor.amounts_hint')}
                </p>
                {fields.map((field) => (
                    <AmountInput
                        key={`${key}-${field.id}`}
                        id={`amount-${key}-${field.id}`}
                        label={labelOf(field, space, resolved, t)}
                        standard={field.standard}
                        value={clampAmount(
                            own?.[field.id] ?? field.standard,
                            field.standard,
                        )}
                        format={format}
                        onChange={(amount) => set(field, amount)}
                        problem={problems[field.id]}
                    />
                ))}
            </fieldset>
        </details>
    );
}
