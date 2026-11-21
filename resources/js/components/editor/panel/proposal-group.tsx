import { useState } from 'react';

import { ContributionPreview } from '@/components/boxes/contribution-preview';
import { useContributionPhoto } from '@/components/editor/collect-contribution';
import { Button } from '@/components/ui/button';
import type { ContributionDecision } from '@/hooks/use-contribution-decision';
import { useTranslation } from '@/hooks/use-translation';
import type { PartGroup, ProposalGroup } from '@/lib/boxes/proposals';
import { newCardDeck } from '@/lib/boxes/proposals';
import type { BoxContributionData, ContributionPart } from '@/lib/boxes/types';
import type { Edition } from '@/lib/edition/types';
import { resolveWords } from '@/lib/edition/words';
import { deckLabel } from '@/lib/editor/catalogue';
import type { PhotoInfos } from '@/lib/editor/photo-cache';
import { formatMoney } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';
import { STRINGS } from '@/lib/render/strings';
import { cn } from '@/lib/utils';

/** What the proposals of friends need from the editor, in "Van vrienden" and in the overview of Samen maken. */
export interface ProposalContext {
    edition: Edition;
    locale: Locale;
    decision: ContributionDecision;
    secret: string | null;
    busy: boolean;
    photos: PhotoInfos;
}

/** "Betaal € 18" or "Ontvang € 18", in the words of the cards. */
function amountLine(amount: number, edition: Edition): string {
    const text = formatMoney(
        Math.abs(amount),
        edition.currency,
        edition.language,
        resolveWords(edition).customSymbol,
    );

    // The words of the card itself, in the language of the edition.
    const words = STRINGS[edition.language];

    return amount < 0 ? words.pay(text) : words.receive(text);
}

function Thumb({
    contribution,
    secret,
    className,
}: {
    contribution: BoxContributionData;
    secret: string | null;
    className?: string;
}) {
    const photo = useContributionPhoto(contribution, secret);

    return (
        <span
            className={cn(
                'block shrink-0 overflow-hidden rounded-control border-2 border-ink bg-table',
                className,
            )}
        >
            {photo !== null && (
                <img src={photo} alt="" className="size-full object-cover" />
            )}
        </span>
    );
}

/** One proposal for one field: what it says, who sent it, Toepassen and Niet gebruiken. */
function Option({
    group,
    contribution,
    context,
    competing,
}: {
    group: PartGroup;
    contribution: BoxContributionData;
    context: ProposalContext;
    competing: boolean;
}) {
    const t = useTranslation();
    const { decision, edition, secret, busy, photos } = context;
    const [looking, setLooking] = useState(false);
    const photo = useContributionPhoto(
        group.part === 'photo'
            ? contribution
            : { ...contribution, photoUrl: null },
        secret,
    );
    const parts: ContributionPart[] = [group.part];
    const working = decision.working === `${contribution.id}:${group.part}`;
    const disabled = decision.working !== null || busy;

    return (
        <li
            data-proposal={`${contribution.id}:${group.part}`}
            className={cn(
                'flex min-w-0 flex-col gap-2 rounded-control border-2 border-ink bg-paper p-3',
                competing && 'border-dashed',
            )}
        >
            <div className="flex items-start gap-3">
                {group.part === 'photo' && (
                    <span className="size-16 shrink-0 overflow-hidden rounded-control border-2 border-ink bg-table">
                        {photo !== null && (
                            <img
                                src={photo}
                                alt=""
                                className="size-full object-cover"
                            />
                        )}
                    </span>
                )}
                <p className="m-0 min-w-0 flex-1 text-sm break-words">
                    {group.part === 'amount' && contribution.amount !== null ? (
                        <strong className="block font-mono text-base">
                            {amountLine(contribution.amount, edition)}
                        </strong>
                    ) : group.part !== 'photo' ? (
                        <strong className="block text-base">
                            “{contribution.value}”
                        </strong>
                    ) : null}
                    <span className="text-ink-soft">
                        {t('collect.by', { name: contribution.firstName })}
                    </span>
                </p>
            </div>
            {looking && group.part !== 'amount' && (
                <div className="flex justify-center rounded-control bg-table p-2">
                    <ContributionPreview
                        edition={edition}
                        contribution={{
                            ...contribution,
                            elementKey: group.elementKey,
                            amount: null,
                            value:
                                group.part === 'photo'
                                    ? null
                                    : contribution.value,
                        }}
                        photoUrl={group.part === 'photo' ? photo : null}
                        photos={photos}
                        maxWidth={220}
                        maxHeight={200}
                    />
                </div>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Button
                    variant="secondary"
                    disabled={disabled}
                    onClick={() =>
                        void decision.decide(contribution, 'accept', parts)
                    }
                >
                    {working ? t('collect.working') : t('collect.accept')}
                </Button>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                        void decision.decide(contribution, 'reject', parts)
                    }
                    className="min-h-11 cursor-pointer border-0 bg-transparent px-2 text-sm font-semibold underline underline-offset-4 disabled:cursor-default disabled:opacity-40"
                >
                    {t('collect.pass')}
                </button>
                {group.part !== 'amount' && (
                    <button
                        type="button"
                        aria-pressed={looking}
                        onClick={() => setLooking((now) => !now)}
                        className="min-h-11 cursor-pointer border-0 bg-transparent px-2 text-sm text-ink-soft underline underline-offset-4"
                    >
                        {looking
                            ? t('collect.preview_hide')
                            : t('collect.preview')}
                    </button>
                )}
            </div>
        </li>
    );
}

/** The proposals for one field of one element; two or more sit side by side, and the owner picks one (B175). */
function PartBlock({
    group,
    context,
}: {
    group: PartGroup;
    context: ProposalContext;
}) {
    const t = useTranslation();
    const competing = group.options.length > 1;

    return (
        <div className="flex flex-col gap-2">
            <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold">
                    {t(`collect.part_${group.part}`)}
                </span>
                {competing && (
                    <span className="text-ink-soft">
                        {t('collect.choose_one', {
                            count: group.options.length,
                        })}
                    </span>
                )}
            </p>
            <ul
                className={cn(
                    'm-0 grid list-none gap-2 p-0',
                    competing && 'min-[480px]:grid-cols-2',
                )}
            >
                {group.options.map((contribution) => (
                    <Option
                        key={contribution.id}
                        group={group}
                        contribution={contribution}
                        context={context}
                        competing={competing}
                    />
                ))}
            </ul>
        </div>
    );
}

/** A new card a friend proposed (B175): it goes in whole, as the next extra card of its deck. */
function NewCard({
    contribution,
    context,
}: {
    contribution: BoxContributionData;
    context: ProposalContext;
}) {
    const t = useTranslation();
    const { decision, edition, secret, busy } = context;
    const working = decision.working === contribution.id;
    const disabled = decision.working !== null || busy;

    return (
        <div
            data-proposal={contribution.id}
            className="flex flex-col gap-3 rounded-control border-2 border-dashed border-ink bg-paper p-3"
        >
            <div className="flex items-start gap-3">
                {contribution.hasPhoto && (
                    <Thumb
                        contribution={contribution}
                        secret={secret}
                        className="size-16"
                    />
                )}
                <p className="m-0 min-w-0 flex-1 text-sm break-words">
                    {contribution.value !== null &&
                        contribution.value !== '' && (
                            <strong className="block text-base">
                                “{contribution.value}”
                            </strong>
                        )}
                    {contribution.amount !== null && (
                        <strong className="block font-mono">
                            {amountLine(contribution.amount, edition)}
                        </strong>
                    )}
                    <span className="text-ink-soft">
                        {t('collect.by', { name: contribution.firstName })}
                    </span>
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Button
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => void decision.decide(contribution, 'accept')}
                >
                    {working ? t('collect.working') : t('collect.add_card')}
                </Button>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void decision.decide(contribution, 'reject')}
                    className="min-h-11 cursor-pointer border-0 bg-transparent px-2 text-sm font-semibold underline underline-offset-4 disabled:cursor-default disabled:opacity-40"
                >
                    {t('collect.reject')}
                </button>
            </div>
        </div>
    );
}

/** The title of a new card: "Nieuwe kaart voor Kans". */
export function newCardTitle(
    key: string,
    edition: Edition,
    locale: Locale,
    t: ReturnType<typeof useTranslation>,
): string | null {
    const deck = newCardDeck(key);

    return deck === null
        ? null
        : t('collect.new_card', { deck: deckLabel(edition, deck, locale) });
}

/** The proposals for one element, per field; or a new card. */
export function ProposalGroupView({
    group,
    context,
}: {
    group: ProposalGroup;
    context: ProposalContext;
}) {
    if (group.newCard !== null) {
        return <NewCard contribution={group.newCard} context={context} />;
    }

    return (
        <div className="flex flex-col gap-4">
            {group.parts.map((part) => (
                <PartBlock
                    key={`${part.elementKey}:${part.part}`}
                    group={part}
                    context={context}
                />
            ))}
        </div>
    );
}
