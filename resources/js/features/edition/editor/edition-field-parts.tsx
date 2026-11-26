import { useId, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { editElement } from '@/features/edition/editor/edit';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import type { Edition, ElementOverride } from '@/lib/render/edition-types';
import { MAX_WORD_LENGTH } from '@/lib/render/edition-words';
import { cn } from '@/lib/utils';

/** The small "Standaard" next to a label: only there when the field differs (B138 §3.5). */
export const StandardButton = ({
    onClick,
    label,
}: {
    onClick: () => void;
    label?: string;
}) => {
    const t = useTranslation();

    return (
        // The same link-like action as in the field panel (B262).
        <Button
            variant="link"
            onClick={onClick}
            aria-label={label}
            className="-my-1.5 shrink-0 gap-1 text-sm"
        >
            <span aria-hidden="true">↺</span>
            {t('edition_panel.standard')}
        </Button>
    );
};

/**
 * A label with, on the right, where the field shows up or its "Standaard". In a narrow column the "Standaard"
 * moves under the label instead of out of the panel (round 4, bug 5).
 */
export const FieldHead = ({
    htmlFor,
    label,
    where,
    standard,
}: {
    htmlFor?: string;
    label: string;
    where?: string;
    standard?: ReactNode;
}) => {
    return (
        <div
            data-field-head
            className="flex min-h-8 min-w-0 flex-wrap items-center justify-between gap-x-2"
        >
            {htmlFor === undefined ? (
                <span className="min-w-0 text-sm font-semibold break-words">
                    {label}
                </span>
            ) : (
                <label
                    htmlFor={htmlFor}
                    className="min-w-0 text-sm font-semibold break-words"
                >
                    {label}
                </label>
            )}
            {standard ??
                (where !== undefined && (
                    <span className="text-right text-xs text-ink-soft">
                        {where}
                    </span>
                ))}
        </div>
    );
};

/** One word of the edition: empty is the standard word, shown grey (B126). */
export const WordInput = ({
    session,
    edition,
    elementKey,
    field,
    label,
    placeholder,
    maxLength = MAX_WORD_LENGTH,
    where,
    className,
}: {
    session: EditionSession;
    edition: Edition;
    elementKey: string;
    field: 'name' | 'text';
    label: string;
    placeholder: string;
    maxLength?: number;
    where?: string;
    className?: string;
}) => {
    const id = useId();
    const value = edition.elements[elementKey]?.[field] ?? '';
    const set = (next: string): void =>
        editElement(
            session,
            elementKey,
            {
                [field]: next === '' ? undefined : next,
            } satisfies Partial<ElementOverride>,
            `words:${elementKey}:${field}`,
        );

    return (
        <div className={cn('flex min-w-0 flex-col gap-1', className)}>
            <FieldHead
                htmlFor={id}
                label={label}
                where={where}
                standard={
                    value === '' ? undefined : (
                        <StandardButton onClick={() => set('')} />
                    )
                }
            />
            <Input
                id={id}
                // The fields of a row line up, also when one label carries its "Standaard" underneath.
                className="mt-auto"
                data-field={`${elementKey}.${field}`}
                value={value}
                maxLength={maxLength}
                placeholder={placeholder}
                autoComplete="off"
                onChange={(event) => set(event.target.value)}
            />
        </div>
    );
};
