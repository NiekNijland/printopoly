import { useId, useRef, useState, type FormEvent, type RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { BoxApiError, sendContribution } from '@/features/edition/boxes/api';
import { ContributionPreview } from '@/features/edition/boxes/contribution-preview';
import {
    useFriendAmount,
    type FriendAmount,
} from '@/features/edition/boxes/friend-amount';
import {
    FriendAmountField,
    FriendPhotoField,
    FriendValueField,
} from '@/features/edition/boxes/friend-fields';
import { addSent, type SentRecord } from '@/features/edition/boxes/local';
import { newCardDeck } from '@/features/edition/boxes/proposals';
import type { FriendBox } from '@/features/edition/boxes/types';
import {
    useFriendPhoto,
    type ChosenPhoto,
} from '@/features/edition/boxes/use-friend-photo';
import { useTranslation } from '@/hooks/use-translation';
import { targetLabel } from '@/lib/render/boxes-labels';
import type { Edition } from '@/lib/render/edition-types';
import { resolveWords } from '@/lib/render/edition-words';
import { deckLabel } from '@/lib/render/editor-catalogue';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { formatMoney } from '@/lib/render/standard-edition';
import type { Locale } from '@/types/game';

const NO_PHOTOS: PhotoInfos = new Map();

type FriendFormProps = {
    box: FriendBox;
    edition: Edition;
    locale: Locale;
    elementKey: string;
    firstName: string;
    /** What the element is called now, for the "Nu:" line. */
    current: string;
    /** For a new card: the extra card it would become, for the preview (B175). */
    previewKey?: string;
    onSent: (record: SentRecord) => void;
};

type FriendSubmit = {
    box: FriendBox;
    elementKey: string;
    firstName: string;
    label: string;
    value: string;
    amount: FriendAmount;
    photo: ChosenPhoto | null;
    honeypot: string;
    format: (value: number) => string;
    onProblem: (problem: string | null) => void;
    onSent: (record: SentRecord) => void;
};

const sentRecord = (
    input: FriendSubmit,
    receipt: string,
    text: string,
): SentRecord => ({
    receipt,
    elementKey: input.elementKey,
    label: input.label,
    value:
        input.amount.amount === null
            ? text
            : [text, input.format(Math.abs(input.amount.amount))]
                  .filter((part) => part !== '')
                  .join(' · '),
    hasPhoto: input.photo !== null,
    sentAt: Date.now(),
});

const useFriendSubmit = () => {
    const t = useTranslation();
    const [sending, setSending] = useState(false);
    const [nameProblem, setNameProblem] = useState(false);

    const submit = async (input: FriendSubmit): Promise<void> => {
        const { box, elementKey, amount, photo, onProblem } = input;
        onProblem(null);
        const name = input.firstName.trim();
        if (name === '') {
            setNameProblem(true);
            document.getElementById('friend-first-name')?.focus();

            return;
        }
        setNameProblem(false);
        const text = input.value.trim();
        if (!amount.amountValid) {
            onProblem(t('boxes.amount_not_allowed'));

            return;
        }
        if (text === '' && photo === null && amount.amount === null) {
            onProblem(t('boxes.nothing_to_add'));

            return;
        }
        setSending(true);
        try {
            const sent = await sendContribution(box.token, {
                elementKey,
                firstName: name,
                value: text,
                amount: amount.amount,
                photo: photo?.upload ?? null,
                website: input.honeypot,
            });
            const record = sentRecord(input, sent.receipt, text);
            addSent(box.token, record);
            input.onSent(record);
        } catch (failure) {
            onProblem(
                failure instanceof BoxApiError && failure.message !== ''
                    ? failure.message
                    : t('friend.error'),
            );
        } finally {
            setSending(false);
        }
    };

    return { sending, nameProblem, submit };
};

const Honeypot = ({
    inputRef,
}: {
    inputRef: RefObject<HTMLInputElement | null>;
}) => (
    // The honeypot: out of sight and out of the tab order. People leave it empty, bots fill it.
    <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
    >
        <label>
            Website
            <input
                ref={inputRef}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
            />
        </label>
    </div>
);

type FriendPreviewProps = {
    edition: Edition;
    elementKey: string;
    amount: number | null;
    field: 'text' | 'town' | 'name';
    value: string;
    photo: ChosenPhoto | null;
};

const FriendPreview = ({
    edition,
    elementKey,
    amount,
    field,
    value,
    photo,
}: FriendPreviewProps) => (
    <div className="flex justify-center rounded-control bg-table p-3">
        <ContributionPreview
            edition={edition}
            contribution={{
                elementKey,
                amount,
                field,
                value: value.trim() === '' ? null : value.trim(),
                width: photo?.width ?? null,
                height: photo?.height ?? null,
            }}
            photoUrl={photo?.url ?? null}
            photos={NO_PHOTOS}
            maxWidth={300}
            maxHeight={280}
        />
    </div>
);

const FriendProblems = ({
    nameProblem,
    problem,
}: {
    nameProblem: boolean;
    problem: string | null;
}) => {
    const t = useTranslation();

    return (
        <>
            {nameProblem && (
                <p
                    role="alert"
                    className="m-0 text-sm font-semibold text-press"
                >
                    {t('boxes.first_name_required')}
                </p>
            )}
            {problem !== null && (
                <p
                    role="alert"
                    className="m-0 text-sm font-semibold text-press"
                >
                    {problem}
                </p>
            )}
        </>
    );
};

const useFriendForm = ({
    box,
    edition,
    locale,
    elementKey,
    firstName,
    onSent,
}: FriendFormProps) => {
    const t = useTranslation();
    const isCard =
        elementKey.startsWith('card.') || newCardDeck(elementKey) !== null;
    const amount = useFriendAmount(elementKey);
    const format = (value: number): string =>
        formatMoney(
            value,
            edition.currency,
            edition.language,
            resolveWords(edition).customSymbol,
        );
    const isTown = elementKey.startsWith('group.');
    const newDeck = newCardDeck(elementKey);
    const label =
        newDeck === null
            ? targetLabel(elementKey, edition, locale, (group) =>
                  t('friend.town_of', { group }),
              )
            : t('friend.new_card_title', {
                  deck: deckLabel(edition, newDeck, locale),
              });
    const [value, setValue] = useState('');
    const [problem, setProblem] = useState<string | null>(null);
    const photo = useFriendPhoto(locale, box.limits.photoMegabytes, setProblem);
    const { sending, nameProblem, submit } = useFriendSubmit();
    const honeypot = useRef<HTMLInputElement>(null);

    const onSubmit = (event: FormEvent): void => {
        event.preventDefault();
        void submit({
            box,
            elementKey,
            firstName,
            label,
            value,
            amount,
            photo: photo.photo,
            honeypot: honeypot.current?.value ?? '',
            format,
            onProblem: setProblem,
            onSent: (record) => {
                setValue('');
                amount.setAmountText('');
                photo.clear();
                onSent(record);
            },
        });
    };

    return {
        isCard,
        isTown,
        field: isCard ? 'text' : isTown ? 'town' : 'name',
        label,
        amount,
        format,
        value,
        setValue,
        problem,
        photo,
        sending,
        nameProblem,
        honeypot,
        onSubmit,
    } as const;
};

/**
 * What a friend adds to the chosen element (B128): a photo with a live preview on the element, and a suggested name
 * or card text. The first name comes from the page. The photo is checked in the browser first; the server checks
 * again.
 */
export const FriendForm = (props: FriendFormProps) => {
    const { box, edition, elementKey, current, previewKey } = props;
    const t = useTranslation();
    const ids = useId();
    const {
        isCard,
        isTown,
        field,
        label,
        amount,
        format,
        value,
        setValue,
        problem,
        photo,
        sending,
        nameProblem,
        honeypot,
        onSubmit,
    } = useFriendForm(props);

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1">
                <h2 className="m-0 font-display text-2xl font-extrabold break-words">
                    {label}
                </h2>
                <p className="m-0 text-sm text-ink-soft">
                    {t('friend.current', { value: current })}
                </p>
            </div>

            <FriendPreview
                edition={edition}
                elementKey={previewKey ?? elementKey}
                amount={amount.amount}
                field={field}
                value={value}
                photo={photo.photo}
            />

            {!isTown && (
                <FriendPhotoField
                    photo={photo.photo}
                    working={photo.working}
                    sending={sending}
                    onChoose={(chosen) => void photo.choose(chosen)}
                    onRemove={photo.clear}
                />
            )}

            <FriendValueField
                id={`${ids}-value`}
                field={field}
                limit={isCard ? box.limits.text : box.limits.name}
                value={value}
                onChange={setValue}
            />

            {amount.rule !== null && (
                <FriendAmountField
                    id={`${ids}-amount`}
                    amount={amount}
                    rule={amount.rule}
                    format={format}
                />
            )}

            <Honeypot inputRef={honeypot} />

            <FriendProblems nameProblem={nameProblem} problem={problem} />

            <Button type="submit" disabled={sending || photo.working}>
                {sending ? t('friend.sending') : t('friend.submit')}
            </Button>
            <p className="m-0 text-sm text-ink-soft">{t('friend.privacy')}</p>
            {photo.photo !== null && (
                <span className="sr-only">{t('friend.photo_alt')}</span>
            )}
        </form>
    );
};
