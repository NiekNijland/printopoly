import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { editElement } from '@/features/edition/editor/edit';
import { FieldLabel } from '@/features/edition/editor/panel/panel-parts';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import {
    amountFields,
    amountRange,
    clampAmount,
    type AmountField,
    type AmountRange,
} from '@/lib/render/edition-amounts';
import { baselineField } from '@/lib/render/edition-baseline';
import { spaceKey } from '@/lib/render/edition-keys';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import { formatMoney } from '@/lib/render/standard-edition';
import { cn } from '@/lib/utils';
import type { Space } from '@/types/game';

type AmountInputProps = {
    id: string;
    label: string;
    /**
     * The standard amount (a positive number, also for money a player pays). `undefined` for an amount without
     * a standard, such as on an extra card (B135); then `range` says what is allowed.
     */
    standard: number | undefined;
    /** The allowed amounts; by default 20% around the standard (B132). */
    range?: AmountRange;
    /** The amount the edition has now. */
    value: number;
    /** Called with a valid amount; `standard` brings the field back to the standard value. */
    onChange: (amount: number) => void;
    /** Shows the standard amount with the currency, e.g. `€ 60`. */
    format: (amount: number) => string;
    /** Problem the Controle found, shown under the field. */
    problem?: string;
};

/**
 * A number field for one amount (B132): steppers, the "Standaard" button in the label when it differs, and the
 * standard with the allowed range in mono under it ("standaard € 60, 48 tot 72"). A value outside the range is
 * not applied while typing; on Enter or leaving the field it is set to the nearest limit, and the field says so
 * out loud ("Maximaal 72. Het bedrag staat nu op 72."), so nothing jumps back without a word (UX 7, ronde 3).
 */
export const AmountInput = ({
    id,
    label,
    standard,
    range,
    value,
    onChange,
    format,
    problem,
}: AmountInputProps) => {
    const t = useTranslation();
    const { min, max } = range ?? amountRange(standard ?? 0);
    const [draft, setDraft] = useState<string | null>(null);
    // What happened to a typed amount outside the limits: the limit it got instead.
    const [clamped, setClamped] = useState<{
        limit: 'min' | 'max';
        value: number;
    } | null>(null);
    const shown = draft ?? String(value);
    const typed = shown.trim() === '' ? NaN : Number(shown);
    const invalid =
        draft !== null &&
        !(Number.isInteger(typed) && typed >= min && typed <= max);
    const fixed = min === max;
    /** Where an amount sits on the scale, in percent. */
    const place = (amount: number): number =>
        fixed ? 50 : ((amount - min) / (max - min)) * 100;
    const step = (direction: 1 | -1): void => {
        setDraft(null);
        setClamped(null);
        onChange(Math.min(max, Math.max(min, value + direction)));
    };
    // Leaving the field (or Enter) with an amount outside the limits sets the nearest limit and says so.
    const commit = (): void => {
        if (draft !== null && invalid && Number.isFinite(typed)) {
            const next = Math.min(max, Math.max(min, Math.round(typed)));
            setClamped(
                typed > max || typed < min
                    ? { limit: typed > max ? 'max' : 'min', value: next }
                    : null,
            );
            if (next !== value) {
                onChange(next);
            }
        }
        setDraft(null);
    };

    return (
        <div className="flex flex-col gap-1">
            <FieldLabel
                htmlFor={id}
                label={label}
                onStandard={
                    standard === undefined || value === standard
                        ? undefined
                        : () => {
                              setDraft(null);
                              setClamped(null);
                              onChange(standard);
                          }
                }
            />
            <div className="flex items-center gap-2">
                <Button
                    variant="icon"
                    aria-label={t('editor.amount_lower', { name: label })}
                    disabled={fixed || value <= min}
                    onClick={() => step(-1)}
                    className="size-12 text-xl"
                >
                    −
                </Button>
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
                    className="text-center font-mono"
                    onBlur={commit}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            commit();
                        }
                    }}
                    onChange={(event) => {
                        const next = event.target.value;
                        setDraft(next);
                        setClamped(null);
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
                <Button
                    variant="icon"
                    aria-label={t('editor.amount_higher', { name: label })}
                    disabled={fixed || value >= max}
                    onClick={() => step(1)}
                    className="size-12 text-xl"
                >
                    +
                </Button>
            </div>
            {invalid || fixed ? (
                <p
                    id={`${id}-hint`}
                    className={cn(
                        'm-0 text-sm text-ink-soft',
                        invalid && 'font-semibold text-press',
                    )}
                >
                    {invalid
                        ? t('editor.amount_invalid', { min, max })
                        : t('editor.amount_fixed_hint')}
                </p>
            ) : (
                // The room you have, as a scale (Niek, 22 nov): lowest and highest at the ends, a tick at the
                // standard and a dot at the amount now. One short line says how far it is from the standard.
                <div className="flex flex-col gap-1">
                    <div
                        className="flex items-center gap-2 font-mono text-xs text-ink-soft"
                        aria-hidden="true"
                    >
                        <span>{format(min)}</span>
                        <span className="relative h-1.5 flex-1 rounded-full bg-line">
                            {standard !== undefined && (
                                <span
                                    className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-ink-soft"
                                    style={{
                                        left: `${String(place(standard))}%`,
                                    }}
                                />
                            )}
                            <span
                                className={cn(
                                    'absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink',
                                    standard !== undefined && value !== standard
                                        ? 'bg-press'
                                        : 'bg-card',
                                )}
                                style={{ left: `${String(place(value))}%` }}
                            />
                        </span>
                        <span>{format(max)}</span>
                    </div>
                    <p id={`${id}-hint`} className="m-0 text-sm text-ink-soft">
                        {standard === undefined
                            ? t('editor.amount_between', { min, max })
                            : value === standard
                              ? t('editor.amount_is_standard')
                              : t(
                                    value > standard
                                        ? 'editor.amount_above'
                                        : 'editor.amount_below',
                                    {
                                        diff: format(
                                            Math.abs(value - standard),
                                        ),
                                        standard: format(standard),
                                    },
                                )}
                        <span className="sr-only">
                            {' '}
                            {t('editor.amount_between', { min, max })}
                        </span>
                    </p>
                </div>
            )}
            <p
                role="status"
                className={cn(
                    'm-0 text-sm font-semibold text-press',
                    clamped === null && 'sr-only',
                )}
            >
                {clamped === null
                    ? ''
                    : t(
                          clamped.limit === 'max'
                              ? 'editor.amount_clamped_max'
                              : 'editor.amount_clamped_min',
                          { value: clamped.value },
                      )}
            </p>
            {problem !== undefined && (
                <p role="alert" className="m-0 text-sm text-press">
                    {problem}
                </p>
            )}
        </div>
    );
};

/** The label of one amount of a space, in the words of the edition (houses, hotels). */
const labelOf = (
    field: AmountField,
    space: Space,
    resolved: ResolvedEdition,
    t: ReturnType<typeof useTranslation>,
): string => {
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
};

type SpaceAmountsProps = {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    space: Space;
    /** Messages of the Controle by field id, such as `price`. */
    problems?: Readonly<Record<string, string>>;
};

/**
 * How many amounts of a space differ from where the edition started (the template, else the standard game), for
 * the summary of the section. An amount the template set and nobody changed is not a change (R6 Aisha).
 */
export const changedAmounts = (edition: Edition, space: Space): number => {
    const key = spaceKey(space.position);
    const own = edition.elements[key]?.amounts ?? {};
    const base = baselineField(edition, key, 'amounts') ?? {};
    const ids = new Set([...Object.keys(own), ...Object.keys(base)]);

    return [...ids].filter((id) => own[id] !== base[id]).length;
};

/**
 * Every amount of a space as a number field (B132): price, rents, building cost, mortgage, tax or salary. The
 * rents of a street or a station fold away under one row ("Huur, 6 regels"), like in the design.
 */
export const SpaceAmounts = ({
    session,
    edition,
    resolved,
    space,
    problems = {},
}: SpaceAmountsProps) => {
    const t = useTranslation();
    const fields = amountFields(space);
    const key = spaceKey(space.position);
    const own = edition.elements[key]?.amounts;
    const rents = fields.filter((field) => field.id.startsWith('rent.'));
    const rentChanged = rents.some(
        (field) =>
            own?.[field.id] !== undefined || problems[field.id] !== undefined,
    );
    const [showRents, setShowRents] = useState(rentChanged);

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
    const input = (field: AmountField) => (
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
    );
    const firstRent = fields.findIndex((field) => field.id.startsWith('rent.'));

    return (
        <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
            <legend className="sr-only">{t('editor.amounts_title')}</legend>
            {fields.map((field, index) => {
                if (!field.id.startsWith('rent.')) {
                    return input(field);
                }
                if (index !== firstRent) {
                    return null;
                }

                return (
                    <Collapsible
                        key="rents"
                        open={showRents}
                        onOpenChange={setShowRents}
                        className="flex flex-col gap-3"
                    >
                        <div className="flex min-h-11 items-center justify-between gap-2 border-y border-line">
                            <span className="text-sm font-semibold">
                                {space.type === 'station'
                                    ? t('editor.amount_rents_stations')
                                    : t('editor.amount_rents', {
                                          count: rents.length,
                                      })}
                            </span>
                            <CollapsibleTrigger className="min-h-11 min-w-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-ink underline underline-offset-4">
                                {showRents
                                    ? t('editor.hide')
                                    : t('editor.show')}
                            </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent
                            forceMount
                            hidden={!showRents}
                            className="flex flex-col gap-4"
                        >
                            {rents.map(input)}
                        </CollapsibleContent>
                    </Collapsible>
                );
            })}
            <p className="m-0 text-xs text-ink-soft">
                {t('editor.amounts_hint')}
            </p>
        </fieldset>
    );
};
