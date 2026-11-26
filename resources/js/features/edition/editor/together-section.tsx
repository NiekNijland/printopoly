import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeftIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { proposalGroups } from '@/features/edition/boxes/proposals';
import type { CollectionBox } from '@/features/edition/boxes/use-collection-box';
import {
    DecisionLines,
    type FriendsProps,
} from '@/features/edition/editor/panel/friends-section';
import {
    ProposalGroupView,
    newCardTitle,
} from '@/features/edition/editor/panel/proposal-group';
import { useTranslation } from '@/hooks/use-translation';
import { targetLabel } from '@/lib/render/boxes-labels';
import type { Edition } from '@/lib/render/edition-types';
import type { Locale } from '@/types/game';

interface TogetherSectionProps {
    collect: CollectionBox;
    /** What friends sent, with the decision, so the overview applies right here (B175). */
    friends?: FriendsProps;
    edition: Edition;
    locale: Locale;
    /** Opens the element a contribution is for; the decision is made there (B146). */
    onOpenElement: (key: string) => void;
}

function formatDate(at: number, locale: Locale): string {
    return new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
        day: 'numeric',
        month: 'long',
    }).format(at);
}

/**
 * "Samen maken" as a section of the edition panel (B146, vult B128 aan): the link for the group app, the picture
 * to go with it, and managing the link. What friends sent waits at the element it is for and here in one overview
 * (B175): per element, per field, with competing proposals side by side, to apply here or at the element. One
 * primary button: the link.
 */
export function TogetherSection({
    collect,
    friends,
    edition,
    locale,
    onOpenElement,
}: TogetherSectionProps) {
    const t = useTranslation();
    const { box } = collect;
    const [copied, setCopied] = useState(false);
    const [confirming, setConfirming] = useState<'delete' | 'renew' | null>(
        null,
    );
    const copyTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(copyTimer.current), []);

    // Looking at the section refreshes the box, so what arrived meanwhile shows at once.
    const { refresh } = collect;
    useEffect(() => {
        void refresh();
    }, [refresh]);

    const copy = async (): Promise<void> => {
        if (box === null) {
            return;
        }
        try {
            await navigator.clipboard.writeText(box.url);
            setCopied(true);
            window.clearTimeout(copyTimer.current);
            copyTimer.current = window.setTimeout(() => setCopied(false), 2500);
        } catch {
            // The field is selectable: the person copies by hand.
        }
    };

    const canShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function';
    // The real reason when the server gave one, in plain words next to the button (bug 6 of test round 4).
    const failed = !collect.error
        ? null
        : collect.errorReason === 'too_many_boxes'
          ? t('boxes.too_many_boxes')
          : collect.errorReason === 'too_fast'
            ? t('collect.too_fast')
            : t('collect.action_failed');

    if (!collect.loaded) {
        return (
            <p role="status" className="m-0 text-ink-soft">
                {t('collect.working')}
            </p>
        );
    }

    if (box === null) {
        return (
            <>
                <p className="m-0 text-base">{t('collect.intro')}</p>
                <Button
                    className="self-start"
                    disabled={collect.busy}
                    onClick={() => void collect.start().catch(() => undefined)}
                >
                    {collect.busy ? t('collect.starting') : t('collect.start')}
                </Button>
                {failed !== null && (
                    <p
                        role="alert"
                        className="m-0 text-sm font-semibold text-press"
                    >
                        {failed}
                    </p>
                )}
            </>
        );
    }

    const closed = box.status === 'closed';

    return (
        <>
            <div className="flex flex-col gap-2">
                <label
                    htmlFor="together-link"
                    className="text-sm font-semibold"
                >
                    {t('collect.link_label')}
                </label>
                <Input
                    id="together-link"
                    readOnly
                    value={box.url}
                    onFocus={(event) => event.target.select()}
                    className="font-mono text-sm"
                />
                <div className="flex flex-wrap gap-2">
                    <Button
                        className="min-w-0 flex-1"
                        disabled={closed}
                        onClick={() => void copy()}
                    >
                        {copied ? t('collect.copied') : t('collect.copy')}
                    </Button>
                    {canShare && (
                        <Button
                            variant="secondary"
                            className="min-w-0 flex-1"
                            disabled={closed}
                            onClick={() => {
                                void navigator
                                    .share({
                                        title: edition.name,
                                        text: t('collect.share_text', {
                                            name: edition.name,
                                        }),
                                        url: box.url,
                                    })
                                    .catch(() => undefined);
                            }}
                        >
                            {t('collect.share')}
                        </Button>
                    )}
                </div>
                <p className="m-0 text-sm text-ink-soft">
                    {closed
                        ? t('collect.status_closed')
                        : t('collect.expires', {
                              date: formatDate(box.expiresAt, locale),
                          })}
                </p>
            </div>

            <Overview
                collect={collect}
                friends={friends}
                edition={edition}
                locale={locale}
                onOpenElement={onOpenElement}
            />

            {edition.parts.cards && (
                <div className="flex min-h-11 items-start gap-3 text-sm">
                    <Checkbox
                        id="together-hide-cards"
                        checked={box.cardsHidden}
                        disabled={collect.busy}
                        aria-describedby="together-hide-cards-hint"
                        onCheckedChange={(checked) => {
                            void collect
                                .hideCards(checked === true)
                                .catch(() => undefined);
                        }}
                        className="mt-0.5 flex-none"
                    />
                    <span className="flex flex-col gap-0.5">
                        <label
                            htmlFor="together-hide-cards"
                            className="cursor-pointer font-semibold"
                        >
                            {t('collect.hide_cards')}
                        </label>
                        <span
                            id="together-hide-cards-hint"
                            className="text-ink-soft"
                        >
                            {t('collect.hide_cards_hint')}
                        </span>
                    </span>
                </div>
            )}

            <div className="flex flex-col gap-2 border-t border-line pt-4">
                <h4 className="m-0 text-sm font-semibold">
                    {t('edition_panel.manage')}
                </h4>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                    {!closed && (
                        <button
                            type="button"
                            disabled={collect.busy}
                            onClick={() => {
                                setConfirming(null);
                                void collect.close().catch(() => undefined);
                            }}
                            className={LINK_BUTTON}
                        >
                            {t('collect.close')}
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={collect.busy}
                        aria-expanded={confirming === 'renew'}
                        onClick={() => {
                            setConfirming('renew');
                        }}
                        className={LINK_BUTTON}
                    >
                        {t('collect.renew')}
                    </button>
                    <button
                        type="button"
                        disabled={collect.busy}
                        aria-expanded={confirming === 'delete'}
                        onClick={() => {
                            setConfirming('delete');
                        }}
                        className={`${LINK_BUTTON} ml-auto text-press`}
                    >
                        {t('collect.delete')}
                    </button>
                </div>
                {confirming !== null && (
                    <div
                        role="alertdialog"
                        aria-label={t(
                            confirming === 'delete'
                                ? 'collect.delete'
                                : 'collect.renew',
                        )}
                        className={`flex flex-col gap-3 rounded-control border-2 p-4 ${confirming === 'delete' ? 'border-press' : 'border-ink'}`}
                    >
                        <p className="m-0 font-semibold">
                            {t(
                                confirming === 'delete'
                                    ? 'collect.delete_confirm'
                                    : 'collect.renew_confirm',
                            )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="secondary"
                                disabled={collect.busy}
                                onClick={() => {
                                    const action = confirming;
                                    setConfirming(null);
                                    void (
                                        action === 'delete'
                                            ? collect.remove()
                                            : collect.renew()
                                    ).catch(() => undefined);
                                }}
                            >
                                {t(
                                    confirming === 'delete'
                                        ? 'collect.delete_yes'
                                        : 'collect.renew_yes',
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setConfirming(null)}
                            >
                                {t('collect.cancel')}
                            </Button>
                        </div>
                    </div>
                )}
                {failed !== null && (
                    <p
                        role="alert"
                        className="m-0 text-sm font-semibold text-press"
                    >
                        {failed}
                    </p>
                )}
            </div>
        </>
    );
}

const LINK_BUTTON =
    'min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4 disabled:cursor-default disabled:opacity-40';

/**
 * "Wacht op jou": every proposal that waits, per element and per field (B175). Applying one here does the same as
 * at the element; the name of the element opens it.
 */
function Overview({
    collect,
    friends,
    edition,
    locale,
    onOpenElement,
}: {
    collect: CollectionBox;
    friends: FriendsProps | undefined;
    edition: Edition;
    locale: Locale;
    onOpenElement: (key: string) => void;
}) {
    const t = useTranslation();
    const box = collect.box;
    if (box === null) {
        return null;
    }
    const waiting = box.contributions.filter((item) => item.open.length > 0);
    const groups = proposalGroups(waiting);
    const label = (key: string): string =>
        newCardTitle(key, edition, locale, t) ??
        targetLabel(key, edition, locale, (group) =>
            t('friend.town_of', { group }),
        );

    return (
        <div className="flex flex-col gap-3">
            <h4 className="m-0 text-sm font-semibold">
                {t('edition_panel.waiting_title')}
                {waiting.length > 0 && ` (${String(waiting.length)})`}
            </h4>
            {/* Right under the heading: the group it was about may just have gone (bug 30). */}
            {friends !== undefined && (
                <DecisionLines
                    note={friends.decision.note}
                    problem={friends.decision.problem}
                    here={() => true}
                />
            )}
            {groups.length === 0 ? (
                <p className="m-0 text-sm text-ink-soft">
                    {t(
                        box.status === 'closed'
                            ? 'collect.empty_closed'
                            : 'collect.empty',
                    )}
                </p>
            ) : (
                <>
                    <p className="m-0 text-xs text-ink-soft">
                        {t('edition_panel.waiting_hint')}
                    </p>
                    <ul className="m-0 flex list-none flex-col gap-4 p-0">
                        {groups.map((group) => (
                            <li
                                key={group.newCard?.id ?? group.target}
                                data-waiting={group.target}
                                className="flex flex-col gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0"
                            >
                                {group.newCard === null ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onOpenElement(group.target)
                                        }
                                        aria-label={t('collect.go_to', {
                                            element: label(group.target),
                                        })}
                                        className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-control border-0 bg-transparent px-0 text-left hover:underline"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="size-2 flex-none rounded-full bg-press"
                                        />
                                        <strong className="min-w-0 flex-1 truncate font-display text-base">
                                            {label(group.target)}
                                        </strong>
                                        <ChevronLeftIcon
                                            size={16}
                                            className="flex-none rotate-180"
                                        />
                                    </button>
                                ) : (
                                    <p className="m-0 flex min-h-11 items-center gap-2">
                                        <span
                                            aria-hidden="true"
                                            className="size-2 flex-none rounded-full bg-press"
                                        />
                                        <strong className="font-display text-base">
                                            {label(group.target)}
                                        </strong>
                                    </p>
                                )}
                                {friends !== undefined && (
                                    <ProposalGroupView
                                        group={group}
                                        context={friends}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            )}
            {(box.accepted > 0 || box.rejected > 0) && (
                <p className="m-0 text-sm text-ink-soft">
                    {t('collect.counts', {
                        accepted: box.accepted,
                        rejected: box.rejected,
                    })}
                </p>
            )}
        </div>
    );
}
