import { useState } from 'react';

type AmountDraftProps = {
    value: number;
    min: number;
    max: number;
    onChange: (amount: number) => void;
};

export const useAmountDraft = ({
    value,
    min,
    max,
    onChange,
}: AmountDraftProps) => {
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
    const type = (next: string): void => {
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
    };
    const reset = (amount: number): void => {
        setDraft(null);
        setClamped(null);
        onChange(amount);
    };

    return { shown, invalid, clamped, step, commit, type, reset };
};
