import { useId, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    FieldDescription,
    FieldTitle,
    FieldLabel as UiFieldLabel,
} from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

/**
 * Keeps what is being typed while the field is empty, so clearing it does not jump to the default. A draft
 * belongs to the element (`scope`) it was typed for: when another element is shown, even without the field
 * losing focus first (a keyboard shortcut, a click on the board), the field shows that element's own value.
 */
export const useDraft = (
    value: string,
    scope: string,
): {
    shown: string;
    set: (next: string) => void;
    end: () => void;
} => {
    const [draft, setDraft] = useState<{ scope: string; text: string } | null>(
        null,
    );

    return {
        shown: draft?.scope === scope ? draft.text : value,
        set: (next) => setDraft({ scope, text: next }),
        end: () => setDraft(null),
    };
};

/** The small "Standaard" button in a label (B142): only there when the field differs from the standard. */
export const StandardButton = ({
    label,
    onClick,
}: {
    /** What the field is called, for screen readers: "Naam: terug naar standaard". */
    label: string;
    onClick: () => void;
}) => {
    const t = useTranslation();

    return (
        // A link-like action, like every small action in the panels (R6 Tom: one look per kind, B262); 44 px high.
        <Button
            variant="link"
            onClick={onClick}
            aria-label={t('editor.standard_named', { name: label })}
            data-standard
            className="-my-1.5 shrink-0 gap-1 text-sm"
        >
            <span aria-hidden="true">↺</span>
            {t('editor.standard')}
        </Button>
    );
};

type FieldLabelProps = {
    /** The id of the control, so a click on the label focuses it. */
    htmlFor?: string;
    label: string;
    /** Shows the "Standaard" button: the field differs from the standard. */
    onStandard?: () => void;
    /** A group field says for how many elements it counts: "geldt voor alle 3 bruine straten". */
    tag?: string;
};

/** The label row of a field: the name, and on the right a group tag or the "Standaard" button. */
export const FieldLabel = ({
    htmlFor,
    label,
    onStandard,
    tag,
}: FieldLabelProps) => {
    return (
        <div className="flex min-h-8 items-center justify-between gap-2">
            {htmlFor === undefined ? (
                <FieldTitle className="font-semibold">{label}</FieldTitle>
            ) : (
                <UiFieldLabel htmlFor={htmlFor} className="leading-snug">
                    {label}
                </UiFieldLabel>
            )}
            <span className="flex items-center gap-2">
                {tag !== undefined && (
                    <span className="text-right text-xs text-ink-soft">
                        {tag}
                    </span>
                )}
                {onStandard !== undefined && (
                    <StandardButton label={label} onClick={onStandard} />
                )}
            </span>
        </div>
    );
};

/** A field (shadcn Field pieces): the label row, the control, and an optional hint of one line. */
export const Field = ({
    label,
    children,
    hint,
    onStandard,
    tag,
}: {
    label: string;
    children: (id: string) => ReactNode;
    hint?: ReactNode;
    onStandard?: () => void;
    tag?: string;
}) => {
    const id = useId();

    return (
        <div data-slot="field" className="flex flex-col gap-1">
            <FieldLabel
                htmlFor={id}
                label={label}
                onStandard={onStandard}
                tag={tag}
            />
            {children(id)}
            {hint !== undefined && (
                <FieldDescription className="m-0 text-xs text-ink-soft">
                    {hint}
                </FieldDescription>
            )}
        </div>
    );
};

/**
 * An on/off field as shadcn Checkbox with its label: "Zwart-wit", "Titel tonen". The label is a real label, so a
 * click on the words ticks the box; `field` is the `data-field` a Controle row or a shortcut looks for.
 */
export const CheckField = ({
    label,
    checked,
    onCheckedChange,
    field,
    disabled,
    className,
}: {
    label: ReactNode;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    field?: string;
    disabled?: boolean;
    className?: string;
}) => {
    const id = useId();

    return (
        <div
            data-slot="field"
            data-disabled={disabled === true ? 'true' : undefined}
            className={cn('flex min-h-11 items-center gap-2', className)}
        >
            <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                data-field={field}
                onCheckedChange={(next) => onCheckedChange(next === true)}
            />
            <UiFieldLabel
                htmlFor={id}
                className="cursor-pointer text-base leading-snug font-normal"
            >
                {label}
            </UiFieldLabel>
        </div>
    );
};

/**
 * A slider with its label and what it is set to ("Zoom 120%", "Hoogte midden"), on shadcn's Slider. The thumb is the
 * focusable element, so it carries the name, the value text and the `data-field`.
 */
export const RangeField = ({
    label,
    shown,
    value,
    min,
    max,
    step = 1,
    onChange,
    field,
    valueText,
    disabled,
    className,
}: {
    label: string;
    /** What the slider is set to, after the label: "120%". */
    shown?: ReactNode;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (next: number) => void;
    field?: string;
    /** Read out instead of the number, such as "midden". */
    valueText?: string;
    disabled?: boolean;
    className?: string;
}) => {
    const id = useId();

    return (
        <div
            className={cn(
                'flex flex-col gap-1 text-sm font-semibold',
                className,
            )}
        >
            <span id={id}>
                {label}
                {shown !== undefined && <> {shown}</>}
            </span>
            <Slider
                className="min-h-11"
                value={[value]}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                onValueChange={(next) => {
                    const first = next[0];
                    if (first !== undefined && first !== value) {
                        onChange(first);
                    }
                }}
                thumbProps={{
                    'aria-labelledby': id,
                    'aria-valuetext': valueText,
                    'data-field': field,
                }}
            />
        </div>
    );
};

export type ChoiceOption<T extends string> = {
    id: T;
    label: string;
    /**
     * A shorter text on the segment, so the row fits on one line on a 320 px phone ("Icoon" for "Ander icoon").
     * The full label stays the accessible name and the tooltip; it contains the short text (label in name).
     */
    short?: string;
    /** A small picture before the label, such as where the name sits on the board centre (B187). */
    icon?: ReactNode;
};

const fullLabel = <T extends string>(
    option: ChoiceOption<T>,
): string | undefined =>
    option.short === undefined ? undefined : option.label;

/**
 * A row of choices, only those the element has (§3.4): "Geen / Foto", "Standaard / Icoon / Eigen / Foto". It is
 * shadcn's ToggleGroup as one segmented bar (B195, B196): the chosen segment has the red selection of the design
 * (B88), the arrow keys move between the segments and Space or Enter chooses. A long label wraps inside its
 * segment instead of pushing the row wider than the panel. An option with a picture (B187) shows it above the label.
 */
export const ChoiceRow = <T extends string>({
    label,
    options,
    value,
    onChange,
    name,
    fields,
    columns,
}: {
    label: string;
    options: readonly ChoiceOption<T>[];
    /** Three columns for six choices with a picture, such as the style of the name. */
    columns?: 3;
    value: T;
    onChange: (next: T) => void;
    /** `data-field` per option, so the P shortcut and a Controle row find the photo choice. */
    fields?: Partial<Record<T, string>>;
    /** Shown above the row when the section has more than one choice ("Wat ligt eronder"). */
    name?: string;
}) => {
    const grid =
        options.length >= 4 &&
        options.every((option) => option.icon === undefined);

    return (
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend
                className={cn(
                    'mb-2 p-0 text-sm font-semibold',
                    name === undefined && 'sr-only',
                )}
            >
                {name ?? label}
            </legend>
            <ToggleGroup
                type="single"
                variant="outline"
                value={value}
                onValueChange={(next) => {
                    // A click on the chosen segment would clear the group; a choice row always has one.
                    const chosen = options.find((option) => option.id === next);
                    if (chosen !== undefined) {
                        onChange(chosen.id);
                    }
                }}
                aria-label={label}
                className={cn(
                    'flex w-full',
                    // Four words side by side get 40 px each on a phone with large letters: two rows of two.
                    grid && 'grid grid-cols-2',
                    columns === 3 && 'grid grid-cols-3',
                )}
            >
                {options.map((option) => (
                    <ToggleGroupItem
                        key={option.id}
                        value={option.id}
                        data-choice={option.id}
                        data-field={fields?.[option.id]}
                        aria-label={fullLabel(option)}
                        title={fullLabel(option)}
                        className={cn(
                            'h-auto min-h-12 flex-1 shrink basis-auto px-2 py-1 text-center text-sm leading-tight whitespace-normal min-[400px]:px-3',
                            grid &&
                                'border-line odd:border-l-0 nth-[n+3]:border-t',
                            columns === 3 &&
                                'border-line nth-[3n+1]:border-l-0 nth-[n+4]:border-t',
                            // A picture goes above its label, so three choices with a picture still fit one row.
                            option.icon !== undefined &&
                                'flex-col gap-1 px-1 py-2 text-xs hyphens-auto min-[400px]:px-2',
                        )}
                    >
                        {option.icon}
                        {option.short ?? option.label}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
        </fieldset>
    );
};
