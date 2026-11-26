import { ChevronLeftIcon } from '@/components/icons';
import {
    proposalGroups,
    type ProposalGroup,
} from '@/features/edition/boxes/proposals';
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

const WaitingGroup = ({
    group,
    title,
    friends,
    onOpenElement,
}: {
    group: ProposalGroup;
    title: string;
    friends: FriendsProps | undefined;
    onOpenElement: (key: string) => void;
}) => {
    const t = useTranslation();

    return (
        <li
            data-waiting={group.target}
            className="flex flex-col gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0"
        >
            {group.newCard === null ? (
                <button
                    type="button"
                    onClick={() => onOpenElement(group.target)}
                    aria-label={t('collect.go_to', {
                        element: title,
                    })}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-control border-0 bg-transparent px-0 text-left hover:underline"
                >
                    <span
                        aria-hidden="true"
                        className="size-2 flex-none rounded-full bg-press"
                    />
                    <strong className="min-w-0 flex-1 truncate font-display text-base">
                        {title}
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
                    <strong className="font-display text-base">{title}</strong>
                </p>
            )}
            {friends !== undefined && (
                <ProposalGroupView group={group} context={friends} />
            )}
        </li>
    );
};

/**
 * "Wacht op jou": every proposal that waits, per element and per field (B175). Applying one here does the same as
 * at the element; the name of the element opens it.
 */
export const TogetherOverview = ({
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
}) => {
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
                            <WaitingGroup
                                key={group.newCard?.id ?? group.target}
                                group={group}
                                title={label(group.target)}
                                friends={friends}
                                onOpenElement={onOpenElement}
                            />
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
};
