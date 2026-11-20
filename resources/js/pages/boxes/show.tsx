import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

import { FriendForm } from '@/components/boxes/friend-form';
import { BoardNavigator } from '@/components/editor/board-navigator';
import { LogoMark } from '@/components/logo';
import { RegistrationStrip } from '@/components/registration-strip';
import { Input } from '@/components/ui/input';
import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';
import { useTranslation } from '@/hooks/use-translation';
import { fetchOwnReceipts } from '@/lib/boxes/api';
import {
    readFirstName,
    readSent,
    writeFirstName,
    type SentRecord,
} from '@/lib/boxes/local';
import { editionFromSnapshot } from '@/lib/boxes/snapshot';
import type { FriendBox } from '@/lib/boxes/types';
import {
    BOARD_CENTER_KEY,
    GROUP_IDS,
    cardKey,
    groupKey,
    pawnKey,
} from '@/lib/edition/keys';
import { resolveEdition } from '@/lib/edition/resolve';
import { deckName, elementLabel } from '@/lib/editor/catalogue';
import { standardEdition } from '@/lib/game/standard-edition';
import { cn } from '@/lib/utils';
import { home } from '@/routes';

type Tab = 'board' | 'towns' | 'cards' | 'pawns';

interface BoxShowProps {
    box: FriendBox;
}

const NO_WARNINGS: ReadonlySet<string> = new Set();

/**
 * The page friends open from the link (B128): the board with the names of the edition, pick a space, a card or a
 * pawn, add a photo and/or a suggestion with their first name. No account. Nothing here shows what other friends
 * sent; a friend only sees their own contributions, kept in this browser.
 */
export default function BoxShow({ box }: BoxShowProps) {
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
    const [tab, setTab] = useState<Tab>('board');
    const [selected, setSelected] = useState('space.01');
    const [firstName, setFirstName] = useState('');
    const [sent, setSent] = useState<SentRecord[]>([]);
    const [states, setStates] = useState<Record<string, 'waiting' | 'handled'>>(
        {},
    );
    const [thanks, setThanks] = useState<string | null>(null);

    // Read in an effect: the page is rendered on the server first, where there is no storage.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- storage only exists in the browser, after hydration
        setFirstName(readFirstName());
        const records = readSent(box.token);
        setSent(records);
        if (records.length > 0) {
            fetchOwnReceipts(
                box.token,
                records.map((record) => record.receipt),
            )
                .then(setStates)
                .catch(() => undefined);
        }
    }, [box.token]);

    const closed = box.status !== 'open';
    const tabs: Tab[] = [
        'board',
        'towns',
        ...(box.snapshot.parts.cards ? (['cards'] as const) : []),
        ...(box.snapshot.parts.pawns ? (['pawns'] as const) : []),
    ];

    const select = (key: string): void => {
        if (key === BOARD_CENTER_KEY) {
            return;
        }
        setSelected(key);
        setThanks(null);
        // On a phone the form sits below the board: bring it into view.
        if (window.innerWidth < 1024) {
            requestAnimationFrame(() =>
                document
                    .getElementById('friend-form')
                    ?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }),
            );
        }
    };

    const current = ((): string => {
        const label =
            edition.elements[selected]?.town ??
            elementLabel(selected, edition, box.language);
        const card = resolved.decks?.chance
            .concat(resolved.decks.chest)
            .find((candidate) => `card.${candidate.id}` === selected);

        return card === undefined ? label : card.text;
    })();

    return (
        <div className="min-h-dvh bg-table text-ink">
            <Head title={t('friend.title', { name: box.editionName })} />
            <header className="border-b-2 border-ink bg-card">
                <RegistrationStrip className="h-1.5" />
                <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
                    <Link
                        href={home(locale)}
                        aria-label="Printopoly"
                        className="inline-flex size-12 flex-none items-center justify-center no-underline"
                    >
                        <LogoMark size={32} />
                    </Link>
                    <p className="m-0 min-w-0 truncate font-display text-xl font-extrabold">
                        {box.editionName}
                    </p>
                </div>
            </header>

            <main
                id="content"
                className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6"
            >
                <div className="flex flex-col gap-2">
                    <h1 className="md:text-4xl m-0 font-display text-3xl font-extrabold">
                        {t('friend.title', { name: box.editionName })}
                    </h1>
                    <p className="m-0 max-w-prose text-lg text-ink-soft">
                        {t('friend.lead')}
                    </p>
                </div>

                {closed ? (
                    <section className="flex max-w-prose flex-col gap-2 rounded-control border-2 border-ink bg-card p-6">
                        <h2 className="m-0 font-display text-2xl font-extrabold">
                            {t('friend.closed_title')}
                        </h2>
                        <p className="m-0 text-ink-soft">
                            {t('friend.closed_body')}
                        </p>
                    </section>
                ) : (
                    <>
                        <div className="flex max-w-sm flex-col gap-1">
                            <label
                                htmlFor="friend-first-name"
                                className="font-semibold"
                            >
                                {t('friend.first_name')}
                            </label>
                            <Input
                                id="friend-first-name"
                                value={firstName}
                                maxLength={box.limits.firstName}
                                autoComplete="given-name"
                                onChange={(event) => {
                                    setFirstName(event.target.value);
                                    writeFirstName(event.target.value);
                                }}
                            />
                            <p className="m-0 text-sm text-ink-soft">
                                {t('friend.first_name_hint')}
                            </p>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
                            <section
                                aria-label={t('friend.pick')}
                                className="flex flex-col gap-3"
                            >
                                <h2 className="m-0 font-display text-xl font-extrabold">
                                    {t('friend.pick')}
                                </h2>
                                {tabs.length > 1 && (
                                    <SegmentedTabs
                                        value={tab}
                                        onValueChange={(value) => {
                                            const next = value as Tab;
                                            setTab(next);
                                            setSelected(
                                                next === 'board'
                                                    ? 'space.01'
                                                    : next === 'towns'
                                                      ? groupKey(
                                                            GROUP_IDS[0] ??
                                                                'brown',
                                                        )
                                                      : next === 'cards'
                                                        ? cardKey('chance', 1)
                                                        : pawnKey(1),
                                            );
                                            setThanks(null);
                                        }}
                                    >
                                        <SegmentedTabsList
                                            aria-label={t('friend.pick')}
                                        >
                                            {tabs.map((id) => (
                                                <SegmentedTabsTrigger
                                                    key={id}
                                                    value={id}
                                                >
                                                    {t(`friend.tab_${id}`)}
                                                </SegmentedTabsTrigger>
                                            ))}
                                        </SegmentedTabsList>
                                    </SegmentedTabs>
                                )}

                                {tab === 'board' && (
                                    <>
                                        <p className="m-0 text-sm text-ink-soft">
                                            {t('friend.pick_hint')}
                                        </p>
                                        <BoardNavigator
                                            edition={edition}
                                            interfaceLanguage={locale}
                                            selected={selected}
                                            onSelect={select}
                                            warned={NO_WARNINGS}
                                        />
                                    </>
                                )}
                                {tab === 'towns' && (
                                    <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
                                        {standardEdition.groups.map((group) => {
                                            const key = groupKey(group.id);
                                            const town =
                                                edition.elements[key]?.town;

                                            return (
                                                <li key={key}>
                                                    <button
                                                        type="button"
                                                        aria-pressed={
                                                            selected === key
                                                        }
                                                        onClick={() =>
                                                            select(key)
                                                        }
                                                        className={cn(
                                                            'flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-control border-2 border-ink px-3 py-2 text-left font-semibold',
                                                            selected === key
                                                                ? 'bg-ink text-paper'
                                                                : 'bg-card text-ink',
                                                        )}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className="size-4 flex-none rounded-full border-2 border-ink"
                                                            style={{
                                                                background:
                                                                    group.color,
                                                            }}
                                                        />
                                                        <span className="min-w-0 truncate">
                                                            {town ??
                                                                group.name[
                                                                    box.language
                                                                ]}
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                                {tab === 'cards' && (
                                    <div className="flex flex-col gap-4">
                                        {(['chance', 'chest'] as const).map(
                                            (deck) => (
                                                <div
                                                    key={deck}
                                                    className="flex flex-col gap-2"
                                                >
                                                    <h3 className="m-0 font-display text-lg font-extrabold">
                                                        {deckName(deck, locale)}
                                                    </h3>
                                                    <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                                                        {(
                                                            resolved.decks?.[
                                                                deck
                                                            ] ?? []
                                                        ).map((card, index) => {
                                                            const key = cardKey(
                                                                deck,
                                                                index + 1,
                                                            );

                                                            return (
                                                                <li key={key}>
                                                                    <button
                                                                        type="button"
                                                                        aria-pressed={
                                                                            selected ===
                                                                            key
                                                                        }
                                                                        onClick={() =>
                                                                            select(
                                                                                key,
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            'min-h-12 w-full cursor-pointer rounded-control border-2 border-ink px-3 py-2 text-left text-sm',
                                                                            selected ===
                                                                                key
                                                                                ? 'bg-ink text-paper'
                                                                                : 'bg-card text-ink',
                                                                        )}
                                                                    >
                                                                        <span className="line-clamp-2">
                                                                            {
                                                                                card.text
                                                                            }
                                                                        </span>
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                )}
                                {tab === 'pawns' && (
                                    <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
                                        {(resolved.pawns ?? []).map((pawn) => {
                                            const key = pawnKey(pawn.index);

                                            return (
                                                <li key={key}>
                                                    <button
                                                        type="button"
                                                        aria-pressed={
                                                            selected === key
                                                        }
                                                        onClick={() =>
                                                            select(key)
                                                        }
                                                        className={cn(
                                                            'min-h-12 w-full cursor-pointer rounded-control border-2 border-ink px-3 py-2 text-left font-semibold',
                                                            selected === key
                                                                ? 'bg-ink text-paper'
                                                                : 'bg-card text-ink',
                                                        )}
                                                    >
                                                        {pawn.name}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>

                            <section
                                aria-label={t('friend.title', {
                                    name: box.editionName,
                                })}
                                id="friend-form"
                                className="flex h-fit scroll-mt-4 flex-col gap-4 rounded-control border-2 border-ink bg-card p-4"
                            >
                                {thanks !== null && (
                                    <div
                                        role="status"
                                        className="rounded-control border-2 border-ink bg-board p-3 font-semibold"
                                    >
                                        {thanks}
                                    </div>
                                )}
                                <FriendForm
                                    key={selected}
                                    box={box}
                                    edition={edition}
                                    locale={locale}
                                    elementKey={selected}
                                    firstName={firstName}
                                    current={current}
                                    onSent={(record) => {
                                        setSent((list) => [record, ...list]);
                                        setStates((map) => ({
                                            ...map,
                                            [record.receipt]: 'waiting',
                                        }));
                                        setThanks(
                                            t('friend.sent', {
                                                name: firstName.trim(),
                                            }),
                                        );
                                    }}
                                />
                            </section>
                        </div>
                    </>
                )}

                {sent.length > 0 && (
                    <section
                        aria-labelledby="friend-mine"
                        className="flex max-w-prose flex-col gap-3"
                    >
                        <h2
                            id="friend-mine"
                            className="m-0 font-display text-xl font-extrabold"
                        >
                            {t('friend.mine_title')}
                        </h2>
                        <ul className="m-0 flex list-none flex-col gap-2 p-0">
                            {sent.map((record) => {
                                const state = states[record.receipt];

                                return (
                                    <li
                                        key={record.receipt}
                                        className="flex items-center gap-3 rounded-control border-2 border-ink bg-card p-3"
                                    >
                                        {record.hasPhoto &&
                                            state === 'waiting' && (
                                                <img
                                                    src={`/api/box/${box.token}/mine/${record.receipt}/photo`}
                                                    alt=""
                                                    className="size-14 flex-none rounded-control border-2 border-ink object-cover"
                                                />
                                            )}
                                        <div className="min-w-0 flex-1">
                                            <p className="m-0 font-semibold break-words">
                                                {record.label}
                                                {record.value !== '' &&
                                                    `: ${record.value}`}
                                            </p>
                                            {state !== undefined && (
                                                <p className="m-0 text-sm text-ink-soft">
                                                    {t(
                                                        state === 'waiting'
                                                            ? 'friend.mine_waiting'
                                                            : 'friend.mine_handled',
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}
            </main>

            <footer className="mx-auto max-w-5xl px-4 pb-8 text-sm text-ink-soft">
                <Link href={home(locale)} className="font-semibold">
                    {t('friend.footer')}
                </Link>
            </footer>
        </div>
    );
}
