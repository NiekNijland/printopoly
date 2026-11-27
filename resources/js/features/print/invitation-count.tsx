import { useEffect, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MAX_INVITATIONS } from '@/features/print/estimate';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

const InvitationStepper = ({
    labelId,
    fieldId,
    value,
    draft,
    disabled,
    onDraft,
    onCommit,
    onStep,
}: {
    labelId: string;
    fieldId: string;
    value: number;
    draft: string;
    disabled: boolean;
    onDraft: (draft: string) => void;
    onCommit: () => void;
    onStep: (delta: number) => void;
}) => {
    const t = useTranslation();

    return (
        <div
            role="group"
            aria-labelledby={labelId}
            className={cn(
                'flex flex-none items-center rounded-control border-2 border-ink bg-card',
                disabled && 'opacity-60',
            )}
        >
            <Button
                variant="ghost"
                size="icon"
                aria-label={t('print.invitations.less')}
                disabled={disabled || value <= 1}
                onClick={() => {
                    onStep(-1);
                }}
                className="size-11 rounded-none text-xl font-extrabold hover:bg-paper"
            >
                −
            </Button>
            <Input
                id={fieldId}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                disabled={disabled}
                value={draft}
                onChange={(event) => {
                    onDraft(event.target.value.replace(/\D/g, ''));
                }}
                onBlur={onCommit}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        onCommit();
                    }
                }}
                className="h-11 w-16 rounded-none border-y-0 px-1 text-center font-mono font-semibold tabular-nums focus-visible:bg-paper focus-visible:outline-none disabled:border-y-0"
            />
            <Button
                variant="ghost"
                size="icon"
                aria-label={t('print.invitations.more')}
                disabled={disabled || value >= MAX_INVITATIONS}
                onClick={() => {
                    onStep(1);
                }}
                className="size-11 rounded-none text-xl font-extrabold hover:bg-paper"
            >
                +
            </Button>
        </div>
    );
};

const useInvitationDraft = (
    value: number,
    onChange: (count: number) => void,
) => {
    const [draft, setDraft] = useState(String(value));

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the number changed elsewhere (a reload, the server)
        setDraft(String(value));
    }, [value]);

    const clamp = (count: number): number =>
        Math.min(MAX_INVITATIONS, Math.max(1, Math.round(count)));
    const commit = (): void => {
        const typed = Number.parseInt(draft, 10);
        const next = Number.isFinite(typed) ? clamp(typed) : value;

        setDraft(String(next));

        if (next !== value) {
            onChange(next);
        }
    };
    const step = (delta: number): void => {
        const next = clamp(value + delta);

        setDraft(String(next));
        onChange(next);
    };

    return { draft, setDraft, commit, step };
};

/**
 * "Hoeveel uitnodigingen?" in the invitation row of the print page (B244): one number, with a minus and a plus like
 * the counter of sets in the bar, and a field you can type 80 in. The number is kept when you leave the field or
 * press Enter, so typing does not save every digit. The line under it says what the number means for this set.
 */
export const InvitationCount = ({
    value,
    onChange,
    disabled = false,
    note,
}: {
    value: number;
    onChange: (count: number) => void;
    disabled?: boolean;
    /** What the number takes in this set, such as "Dat is 20 keer het vel met 4 kaarten". */
    note: string;
}) => {
    const t = useTranslation();
    const label = useId();
    const field = useId();
    const { draft, setDraft, commit, step } = useInvitationDraft(
        value,
        onChange,
    );

    return (
        <div className="flex min-w-0 flex-col gap-1">
            <label
                id={label}
                htmlFor={field}
                className="mb-1 flex min-h-8 items-center text-sm font-semibold"
            >
                {t('print.invitations.label')}
            </label>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <InvitationStepper
                    labelId={label}
                    fieldId={field}
                    value={value}
                    draft={draft}
                    disabled={disabled}
                    onDraft={setDraft}
                    onCommit={commit}
                    onStep={step}
                />
                <p aria-live="polite" className="m-0 text-sm text-ink-soft">
                    {note}
                </p>
            </div>
        </div>
    );
};
