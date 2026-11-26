import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { FriendAmount } from '@/features/edition/boxes/friend-amount';
import type { ChosenPhoto } from '@/features/edition/boxes/use-friend-photo';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type FriendPhotoFieldProps = {
    photo: ChosenPhoto | null;
    working: boolean;
    sending: boolean;
    onChoose: (file: File) => void;
    onRemove: () => void;
};

export const FriendPhotoField = ({
    photo,
    working,
    sending,
    onChoose,
    onRemove,
}: FriendPhotoFieldProps) => {
    const t = useTranslation();
    const file = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-col gap-2">
            <span className="font-semibold">{t('friend.photo')}</span>
            <input
                ref={file}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                    const chosen = event.target.files?.[0];
                    event.target.value = '';
                    if (chosen !== undefined) {
                        onChoose(chosen);
                    }
                }}
            />
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant={photo === null ? 'secondary' : 'ghost'}
                    disabled={working || sending}
                    onClick={() => file.current?.click()}
                >
                    {working
                        ? t('friend.photo_working')
                        : photo === null
                          ? t('friend.photo_choose')
                          : t('friend.photo_change')}
                </Button>
                {photo !== null && (
                    <Button
                        variant="ghost"
                        className="underline underline-offset-4"
                        onClick={onRemove}
                    >
                        {t('friend.photo_remove')}
                    </Button>
                )}
            </div>
        </div>
    );
};

type FriendValueFieldProps = {
    id: string;
    field: 'text' | 'town' | 'name';
    limit: number;
    value: string;
    onChange: (value: string) => void;
};

export const FriendValueField = ({
    id,
    field,
    limit,
    value,
    onChange,
}: FriendValueFieldProps) => {
    const t = useTranslation();

    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className="font-semibold">
                {t(
                    field === 'text'
                        ? 'friend.text_label'
                        : field === 'town'
                          ? 'friend.town_label'
                          : 'friend.name_label',
                )}
            </label>
            {field === 'text' ? (
                <Textarea
                    id={id}
                    rows={3}
                    maxLength={limit}
                    value={value}
                    placeholder={t('friend.text_placeholder')}
                    onChange={(event) => onChange(event.target.value)}
                />
            ) : (
                <Input
                    id={id}
                    maxLength={limit}
                    value={value}
                    placeholder={t(
                        field === 'town'
                            ? 'friend.town_placeholder'
                            : 'friend.name_placeholder',
                    )}
                    autoComplete="off"
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
            <p
                aria-live="polite"
                className={cn(
                    'm-0 text-right font-mono text-xs',
                    value.length >= limit ? 'text-press' : 'text-ink-soft',
                )}
            >
                {t('friend.counter', { count: value.length, max: limit })}
            </p>
        </div>
    );
};

const AmountDirection = ({
    direction,
    onChange,
}: {
    direction: 1 | -1;
    onChange: (direction: 1 | -1) => void;
}) => {
    const t = useTranslation();

    return (
        <div
            role="radiogroup"
            aria-label={t('friend.amount_label')}
            className="flex gap-2"
        >
            {([-1, 1] as const).map((choice) => (
                <button
                    key={choice}
                    type="button"
                    role="radio"
                    aria-checked={direction === choice}
                    onClick={() => onChange(choice)}
                    className={cn(
                        'min-h-11 flex-1 cursor-pointer rounded-control border-2 border-ink px-3 font-semibold',
                        direction === choice
                            ? 'bg-ink text-paper'
                            : 'bg-card text-ink',
                    )}
                >
                    {t(
                        choice < 0
                            ? 'friend.amount_pay'
                            : 'friend.amount_receive',
                    )}
                </button>
            ))}
        </div>
    );
};

type FriendAmountFieldProps = {
    id: string;
    amount: FriendAmount;
    rule: NonNullable<FriendAmount['rule']>;
    format: (value: number) => string;
};

export const FriendAmountField = ({
    id,
    amount,
    rule,
    format,
}: FriendAmountFieldProps) => {
    const t = useTranslation();
    const { direction, setDirection, amountText, setAmountText, amountValid } =
        amount;

    return (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 font-semibold">
                {t('friend.amount_label')}
            </legend>
            {rule.sign === null && (
                <AmountDirection
                    direction={direction}
                    onChange={setDirection}
                />
            )}
            <div className="flex items-center gap-2">
                {rule.sign !== null && (
                    <span className="font-semibold">
                        {t(
                            rule.sign < 0
                                ? 'friend.amount_pay'
                                : 'friend.amount_receive',
                        )}
                    </span>
                )}
                <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={rule.min}
                    max={rule.max}
                    step={1}
                    value={amountText}
                    aria-label={t('friend.amount_label')}
                    aria-invalid={!amountValid || undefined}
                    aria-describedby={`${id}-hint`}
                    onChange={(event) => setAmountText(event.target.value)}
                    className="max-w-40 font-mono"
                />
            </div>
            <p
                id={`${id}-hint`}
                className={cn(
                    'm-0 text-sm',
                    amountValid ? 'text-ink-soft' : 'text-press',
                )}
            >
                {t('friend.amount_hint', {
                    min: format(rule.min),
                    max: format(rule.max),
                })}
            </p>
        </fieldset>
    );
};
