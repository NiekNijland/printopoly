import { Head, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';
import { fetchOwnReceipts, type OwnState } from '@/features/edition/boxes/api';
import { FriendForm } from '@/features/edition/boxes/friend-form';
import {
    ClosedNotice,
    FirstNameField,
    FriendFooter,
    FriendHeader,
    FriendHero,
    SendPanel,
    SentList,
    Step,
} from '@/features/edition/boxes/friend-page-sections';
import { PickTab, type Tab } from '@/features/edition/boxes/friend-pick-lists';
import {
    readFirstName,
    readSent,
    writeFirstName,
    type SentRecord,
} from '@/features/edition/boxes/local';
import { newCardDeck } from '@/features/edition/boxes/proposals';
import { editionFromSnapshot } from '@/features/edition/boxes/snapshot';
import type { FriendBox } from '@/features/edition/boxes/types';
import { useTranslation } from '@/hooks/use-translation';
import { reportUnlessOffline } from '@/lib/bugsnag';
import {
    BOARD_CENTER_KEY,
    GROUP_IDS,
    cardKey,
    groupKey,
    pawnKey,
} from '@/lib/render/edition-keys';
import {
    resolveEdition,
    type ResolvedEdition,
} from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import { elementLabel } from '@/lib/render/editor-catalogue';
import { nextExtraCardKey } from '@/lib/render/editor-extra-cards';
import { home } from '@/routes';
import type { Locale } from '@/types/game';

type BoxShowProps = {
    box: FriendBox;
};

const currentOf = (
    selected: string,
    edition: Edition,
    resolved: ResolvedEdition,
    box: FriendBox,
    t: ReturnType<typeof useTranslation>,
): string => {
    if (newCardDeck(selected) !== null) {
        return t('friend.new_card_current');
    }
    if (box.snapshot.cardsHidden === true && selected.startsWith('card.')) {
        return t('friend.cards_hidden');
    }
    // A colour group without a town has no name yet; never its key (bug 28).
    const label = selected.startsWith('group.')
        ? (edition.elements[selected]?.town ?? t('friend.no_town_yet'))
        : elementLabel(selected, edition, box.language);
    const card = resolved.decks?.chance
        .concat(resolved.decks.chest)
        .find((candidate) => `card.${candidate.id}` === selected);

    if (card === undefined) {
        return label;
    }

    return card.text === '' ? t('friend.extra_card_empty') : card.text;
};

const previewKeyOf = (edition: Edition, selected: string) => {
    const deck = newCardDeck(selected);

    return deck === null ? undefined : nextExtraCardKey(edition, deck);
};

const useOwnRecords = (token: string) => {
    const [firstName, setFirstName] = useState('');
    const [sent, setSent] = useState<SentRecord[]>([]);
    const [states, setStates] = useState<Record<string, OwnState>>({});

    // Read in an effect: the page is rendered on the server first, where there is no storage.
    useEffect(() => {
        if (token === '') {
            return;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- storage only exists in the browser, after hydration
        setFirstName(readFirstName());
        const records = readSent(token);
        setSent(records);
        if (records.length > 0) {
            fetchOwnReceipts(
                token,
                records.map((record) => record.receipt),
            )
                .then(setStates)
                .catch(reportUnlessOffline);
        }
    }, [token]);

    const add = (record: SentRecord): void => {
        setSent((list) => [record, ...list]);
        setStates((map) => ({ ...map, [record.receipt]: 'waiting' }));
    };

    return { firstName, setFirstName, sent, states, add };
};

const firstOf = (tab: Tab): string =>
    tab === 'board'
        ? 'space.01'
        : tab === 'towns'
          ? groupKey(GROUP_IDS[0] ?? 'brown')
          : tab === 'cards'
            ? cardKey('chance', 1)
            : pawnKey(1);

const PickTabs = ({
    tabs,
    tab,
    onTab,
}: {
    tabs: Tab[];
    tab: Tab;
    onTab: (tab: Tab) => void;
}) => {
    const t = useTranslation();

    return (
        <SegmentedTabs
            value={tab}
            onValueChange={(value) => {
                const next = tabs.find((id) => id === value);
                if (next !== undefined) {
                    onTab(next);
                }
            }}
        >
            <SegmentedTabsList aria-label={t('friend.pick')}>
                {tabs.map((id) => (
                    <SegmentedTabsTrigger key={id} value={id}>
                        {t(`friend.tab_${id}`)}
                    </SegmentedTabsTrigger>
                ))}
            </SegmentedTabsList>
        </SegmentedTabs>
    );
};

const useFriendPick = () => {
    const [tab, setTab] = useState<Tab>('board');
    const [selected, setSelected] = useState('space.01');
    const [thanks, setThanks] = useState<string | null>(null);

    const select = (key: string): void => {
        if (key === BOARD_CENTER_KEY) {
            return;
        }
        setSelected(key);
        setThanks(null);
        // On a phone the form sits below the board: bring it into view.
        if (window.innerWidth < 1024) {
            requestAnimationFrame(() => {
                const form: Partial<HTMLElement> | null =
                    document.getElementById('friend-form');
                form?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
            });
        }
    };
    const switchTab = (next: Tab): void => {
        setTab(next);
        setSelected(firstOf(next));
        setThanks(null);
    };

    return { tab, selected, thanks, setThanks, select, switchTab };
};

type Friend = {
    box: FriendBox;
    edition: Edition;
    resolved: ResolvedEdition;
    locale: Locale;
    title: string;
    pick: ReturnType<typeof useFriendPick>;
    own: ReturnType<typeof useOwnRecords>;
};

const FriendWork = ({ friend }: { friend: Friend }) => {
    const t = useTranslation();
    const { box, edition, resolved, locale, pick, own } = friend;
    const tabs: Tab[] = [
        'board',
        'towns',
        ...(box.snapshot.parts.cards ? (['cards'] as const) : []),
        ...(box.snapshot.parts.pawns ? (['pawns'] as const) : []),
    ];

    return (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12">
            <section
                aria-label={t('friend.pick')}
                className="flex flex-col gap-3"
            >
                <h2 className="m-0 font-display text-xl font-extrabold">
                    <Step n={2} />
                    {t('friend.pick')}
                </h2>
                {tabs.length > 1 && (
                    <PickTabs
                        tabs={tabs}
                        tab={pick.tab}
                        onTab={pick.switchTab}
                    />
                )}
                <PickTab
                    tab={pick.tab}
                    edition={edition}
                    resolved={resolved}
                    locale={locale}
                    selected={pick.selected}
                    cardsHidden={box.snapshot.cardsHidden === true}
                    onSelect={pick.select}
                />
            </section>
            <SendPanel title={friend.title} thanks={pick.thanks}>
                <FriendForm
                    key={pick.selected}
                    box={box}
                    edition={edition}
                    locale={locale}
                    elementKey={pick.selected}
                    firstName={own.firstName}
                    current={currentOf(
                        pick.selected,
                        edition,
                        resolved,
                        box,
                        t,
                    )}
                    previewKey={previewKeyOf(edition, pick.selected)}
                    onSent={(record) => {
                        own.add(record);
                        pick.setThanks(
                            t('friend.sent', { name: own.firstName.trim() }),
                        );
                    }}
                />
            </SendPanel>
        </div>
    );
};

/**
 * The page friends open from the link (B128): the board with the names of the edition, pick a space, a card or a
 * pawn, add a photo and/or a suggestion with their first name. No account. Nothing here shows what other friends
 * sent; a friend only sees their own contributions, kept in this browser.
 */
const BoxShow = ({ box }: BoxShowProps) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const edition = useMemo(
        () =>
            editionFromSnapshot(box.snapshot, {
                name: box.editionName,
                language: box.language,
            }),
        [box],
    );
    const resolved = useMemo(() => resolveEdition(edition), [edition]);
    const pick = useFriendPick();
    const own = useOwnRecords(box.token);
    const closed = box.status !== 'open';
    const title = t('friend.title', { name: box.editionName });

    return (
        <div className="flex min-h-dvh flex-col bg-table text-ink">
            <Head title={title}>
                {/* The preview in the group app when the link is shared (B175). */}
                <meta head-key="og:title" property="og:title" content={title} />
                <meta
                    head-key="og:description"
                    property="og:description"
                    content={t('friend.lead')}
                />
                <meta head-key="og:type" property="og:type" content="website" />
            </Head>
            <FriendHeader name={box.editionName} homeHref={home(locale)} />
            <FriendHero
                title={title}
                resolved={resolved}
                nameField={
                    !closed && (
                        <FirstNameField
                            value={own.firstName}
                            maxLength={box.limits.firstName}
                            onChange={(value) => {
                                own.setFirstName(value);
                                writeFirstName(value);
                            }}
                        />
                    )
                }
            />
            <main
                id="content"
                tabIndex={-1}
                className="mx-auto flex w-full max-w-content flex-1 flex-col gap-10 px-4 py-8 outline-none md:px-8 md:py-12"
            >
                {closed ? (
                    <ClosedNotice replaced={box.status === 'replaced'} />
                ) : (
                    <FriendWork
                        friend={{
                            box,
                            edition,
                            resolved,
                            locale,
                            title,
                            pick,
                            own,
                        }}
                    />
                )}

                {own.sent.length > 0 && (
                    <SentList
                        token={box.token}
                        sent={own.sent}
                        states={own.states}
                    />
                )}
            </main>
            <FriendFooter homeHref={home(locale)} />
        </div>
    );
};
export default BoxShow;
