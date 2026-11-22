import { usePage } from '@inertiajs/react';
import { AmountInput, SpaceAmounts } from '@/components/editor/amount-fields';
import { useTranslation } from '@/hooks/use-translation';
import type { CheckIssue } from '@/lib/checks/types';
import {
    amountRange,
    MAX_EXTRA_CARD_AMOUNT,
    NO_CARD_AMOUNT,
} from '@/lib/edition/amounts';
import { baselineField } from '@/lib/edition/baseline';
import { spaceKey, type ElementKind } from '@/lib/edition/keys';
import type { ResolvedCard, ResolvedEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition, ElementOverride } from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import { formatMoney } from '@/lib/game/standard-edition';
import type { Space } from '@/lib/game/types';

import { CheckField, ChoiceRow } from './panel-parts';

interface AmountSectionProps {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    editKey: string;
    kind: ElementKind;
    space: Space | undefined;
    card: ResolvedCard | undefined;
    issues: readonly CheckIssue[];
}

/** The Bedragen section (B132, B141): the amounts of a space, the amount of a card, or what is fixed on a note. */
export function AmountSection({
    session,
    edition,
    resolved,
    editKey,
    kind,
    space,
    card,
    issues,
}: AmountSectionProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const format = (amount: number): string =>
        formatMoney(
            amount,
            resolved.currency.id,
            resolved.language,
            resolved.words.customSymbol,
        );

    if (space !== undefined) {
        return (
            <SpaceAmounts
                key={space.position}
                session={session}
                edition={edition}
                resolved={resolved}
                space={space}
                problems={Object.fromEntries(
                    issues
                        .filter(
                            (issue) =>
                                issue.elementKey === spaceKey(space.position) &&
                                issue.field.startsWith('amounts.'),
                        )
                        .map((issue) => [
                            issue.field.slice('amounts.'.length),
                            issue.message[locale],
                        ]),
                )}
            />
        );
    }

    if (kind === 'note') {
        const note = resolved.money?.notes.find(
            (candidate) => `note.${candidate.value}` === editKey,
        );

        return (
            <p className="m-0 text-sm">
                {t('editor.note_fixed', {
                    value: format(note?.value ?? 0),
                    count: note?.count ?? 0,
                })}
            </p>
        );
    }

    if (card === undefined) {
        return null;
    }

    const problem = issues.find((issue) => issue.field === 'amount')?.message[
        locale
    ];

    return card.extra ? (
        <ExtraCardAmount
            key={editKey}
            session={session}
            editKey={editKey}
            override={edition.elements[editKey]}
            format={format}
            problem={problem}
        />
    ) : (
        <CardAmount
            session={session}
            editKey={editKey}
            card={card}
            baseline={baselineField(edition, editKey, 'amount')}
            override={edition.elements[editKey]}
            format={format}
            problem={problem}
        />
    );
}

interface CardAmountProps {
    session: EditionSession;
    editKey: string;
    override: ElementOverride | undefined;
    format: (amount: number) => string;
    problem: string | undefined;
}

/**
 * The amount line of a standard card (B132, B140): within 20%, paying or receiving stays as it is. "Standaard" is
 * the amount of the template the edition started from, when it set one (B152); the range stays the 20% around
 * the standard card.
 */
function CardAmount({
    session,
    editKey,
    card,
    baseline,
    override,
    format,
    problem,
}: CardAmountProps & {
    card: ResolvedCard;
    /** The amount the template set, signed; `undefined` when the standard card is the baseline. */
    baseline: number | undefined;
}) {
    const t = useTranslation();
    const standard = Math.abs(card.standardAmount ?? 0);
    const sign = Math.sign(card.standardAmount ?? 1);
    const target =
        baseline === undefined || baseline === NO_CARD_AMOUNT
            ? standard
            : Math.abs(baseline);
    const shown = override?.amount !== NO_CARD_AMOUNT;
    const value = Math.abs(card.amount ?? card.standardAmount ?? 0);

    return (
        <div className="flex flex-col gap-3">
            {shown && (
                <AmountInput
                    id={`amount-${editKey}`}
                    label={
                        sign < 0
                            ? t('editor.amount_pay')
                            : t('editor.amount_receive')
                    }
                    standard={target}
                    range={amountRange(standard)}
                    value={value}
                    format={format}
                    problem={problem}
                    onChange={(amount) =>
                        editElement(
                            session,
                            editKey,
                            {
                                // The standard amount is stored as no amount, unless the template set its own.
                                amount:
                                    amount === standard && target === standard
                                        ? undefined
                                        : sign * amount,
                            },
                            `amount:${editKey}`,
                        )
                    }
                />
            )}
            <CheckField
                label={t('editor.amount_show')}
                checked={shown}
                onCheckedChange={(checked) =>
                    editElement(
                        session,
                        editKey,
                        {
                            amount: checked
                                ? target === standard
                                    ? undefined
                                    : sign * target
                                : NO_CARD_AMOUNT,
                        },
                        `amount:${editKey}`,
                    )
                }
            />
            <p className="m-0 text-xs text-ink-soft">
                {shown
                    ? t('editor.amount_hint')
                    : t('editor.amount_hidden_hint')}
            </p>
        </div>
    );
}

type Direction = 'none' | 'pay' | 'receive';

/**
 * The amount of an extra card (B135): no standard, so first whether the card pays or receives, then a free
 * amount up to 500.
 */
function ExtraCardAmount({
    session,
    editKey,
    override,
    format,
    problem,
}: CardAmountProps) {
    const t = useTranslation();
    const amount = override?.amount;
    const shown: Direction =
        amount === undefined ? 'none' : amount < 0 ? 'pay' : 'receive';
    const value = Math.abs(amount ?? 0) || 50;

    return (
        <div className="flex flex-col gap-3">
            <ChoiceRow<Direction>
                label={t('editor.amount_direction')}
                options={[
                    { id: 'none', label: t('editor.amount_none') },
                    { id: 'pay', label: t('editor.amount_pay') },
                    { id: 'receive', label: t('editor.amount_receive') },
                ]}
                value={shown}
                onChange={(next) => {
                    editElement(session, editKey, {
                        amount:
                            next === 'none'
                                ? undefined
                                : (next === 'pay' ? -1 : 1) * value,
                    });
                }}
            />
            {shown !== 'none' && (
                <AmountInput
                    id={`amount-${editKey}`}
                    label={t('editor.amount')}
                    standard={undefined}
                    range={{ min: 1, max: MAX_EXTRA_CARD_AMOUNT }}
                    value={value}
                    format={format}
                    problem={problem}
                    onChange={(next) =>
                        editElement(
                            session,
                            editKey,
                            { amount: (shown === 'pay' ? -1 : 1) * next },
                            `amount:${editKey}`,
                        )
                    }
                />
            )}
            <p className="m-0 text-xs text-ink-soft">
                {t('editor.amount_extra_hint', { max: MAX_EXTRA_CARD_AMOUNT })}
            </p>
        </div>
    );
}
