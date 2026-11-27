import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { AmountHint } from '@/features/edition/editor/amount-scale';
import { editElement } from '@/features/edition/editor/edit';
import { FieldLabel } from '@/features/edition/editor/panel/panel-parts';
import { useAmountDraft } from '@/features/edition/editor/use-amount-draft';
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

const AmountStep = ({
    label,
    disabled,
    onStep,
    children,
}: {
    label: string;
    disabled: boolean;
    onStep: () => void;
    children: string;
}) => (
    <Button
        variant="icon"
        aria-label={label}
        disabled={disabled}
        onClick={onStep}
        className="size-12 text-xl"
    >
        {children}
    </Button>
);

const ClampedNote = ({
    clamped,
}: {
    clamped: ReturnType<typeof useAmountDraft>['clamped'];
}) => {
    const t = useTranslation();

    return (
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
    );
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
    const fixed = min === max;
    const { shown, invalid, clamped, step, commit, type, reset } =
        useAmountDraft({ value, min, max, onChange });

    return (
        <div className="flex flex-col gap-1">
            <FieldLabel
                htmlFor={id}
                label={label}
                onStandard={
                    standard === undefined || value === standard
                        ? undefined
                        : () => reset(standard)
                }
            />
            <div className="flex items-center gap-2">
                <AmountStep
                    label={t('editor.amount_lower', { name: label })}
                    disabled={fixed || value <= min}
                    onStep={() => step(-1)}
                >
                    −
                </AmountStep>
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
                    onChange={(event) => type(event.target.value)}
                />
                <AmountStep
                    label={t('editor.amount_higher', { name: label })}
                    disabled={fixed || value >= max}
                    onStep={() => step(1)}
                >
                    +
                </AmountStep>
            </div>
            <AmountHint
                id={id}
                min={min}
                max={max}
                standard={standard}
                value={value}
                format={format}
                invalid={invalid}
            />
            <ClampedNote clamped={clamped} />
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

const setAmount = (
    session: EditionSession,
    key: string,
    own: Readonly<Record<string, number>> | undefined,
    field: AmountField,
    amount: number,
): void => {
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

const RentRows = ({
    stations,
    count,
    open,
    onOpenChange,
    children,
}: {
    stations: boolean;
    count: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
}) => {
    const t = useTranslation();

    return (
        <Collapsible
            open={open}
            onOpenChange={onOpenChange}
            className="flex flex-col gap-3"
        >
            <div className="flex min-h-11 items-center justify-between gap-2 border-y border-line">
                <span className="text-sm font-semibold">
                    {stations
                        ? t('editor.amount_rents_stations')
                        : t('editor.amount_rents', {
                              count,
                          })}
                </span>
                <CollapsibleTrigger className="min-h-11 min-w-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-ink underline underline-offset-4">
                    {open ? t('editor.hide') : t('editor.show')}
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent
                forceMount
                hidden={!open}
                className="flex flex-col gap-4"
            >
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
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
            onChange={(amount) => setAmount(session, key, own, field, amount)}
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
                    <RentRows
                        key="rents"
                        stations={space.type === 'station'}
                        count={rents.length}
                        open={showRents}
                        onOpenChange={setShowRents}
                    >
                        {rents.map(input)}
                    </RentRows>
                );
            })}
            <p className="m-0 text-xs text-ink-soft">
                {t('editor.amounts_hint')}
            </p>
        </fieldset>
    );
};
