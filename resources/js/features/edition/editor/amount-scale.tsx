import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type AmountScaleProps = {
    id: string;
    min: number;
    max: number;
    standard: number | undefined;
    value: number;
    format: (amount: number) => string;
};

const AmountScale = ({
    id,
    min,
    max,
    standard,
    value,
    format,
}: AmountScaleProps) => {
    const t = useTranslation();
    const fixed = min === max;
    /** Where an amount sits on the scale, in percent. */
    const place = (amount: number): number =>
        fixed ? 50 : ((amount - min) / (max - min)) * 100;

    return (
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
                                diff: format(Math.abs(value - standard)),
                                standard: format(standard),
                            },
                        )}
                <span className="sr-only">
                    {' '}
                    {t('editor.amount_between', { min, max })}
                </span>
            </p>
        </div>
    );
};

export const AmountHint = ({
    invalid,
    ...scale
}: AmountScaleProps & { invalid: boolean }) => {
    const t = useTranslation();
    const { id, min, max } = scale;

    return invalid || min === max ? (
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
        <AmountScale {...scale} />
    );
};
