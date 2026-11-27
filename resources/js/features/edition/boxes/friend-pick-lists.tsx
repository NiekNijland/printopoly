import type { ReactNode } from 'react';

import { newCardKey } from '@/features/edition/boxes/proposals';
import { BoardNavigator } from '@/features/edition/editor/board-navigator';
import { useTranslation } from '@/hooks/use-translation';
import { friendCanAddToSpace } from '@/lib/render/boxes-labels';
import { groupColor, groupTitle } from '@/lib/render/edition-group-names';
import { BOARD_CENTER_KEY, groupKey, pawnKey } from '@/lib/render/edition-keys';
import type {
    ResolvedCard,
    ResolvedEdition,
} from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import { deckLabel, elementLabel } from '@/lib/render/editor-catalogue';
import { nextExtraCardKey } from '@/lib/render/editor-extra-cards';
import { standardEdition } from '@/lib/render/standard-edition';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/game';

export type Tab = 'board' | 'towns' | 'cards' | 'pawns';

const NO_WARNINGS: ReadonlySet<string> = new Set();

/** The board centre is no target, but it should not look switched off; `select` passes it by. */
const pickable = (key: string): boolean =>
    key === BOARD_CENTER_KEY || friendCanAddToSpace(key);

type PickProps = {
    edition: Edition;
    selected: string;
    onSelect: (key: string) => void;
};

const PickButton = ({
    active,
    onClick,
    className,
    children,
}: {
    active: boolean;
    onClick: () => void;
    className: string;
    children: ReactNode;
}) => (
    <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={className}
    >
        {children}
    </button>
);

const TownList = ({
    edition,
    selected,
    onSelect,
    locale,
}: PickProps & { locale: Locale }) => (
    <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
        {standardEdition.groups.map((group) => {
            const key = groupKey(group.id);
            const town = edition.elements[key]?.town;

            return (
                <li key={key}>
                    <PickButton
                        active={selected === key}
                        onClick={() => onSelect(key)}
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
                                background: groupColor(edition, group.id),
                            }}
                        />
                        <span className="min-w-0 truncate">
                            {town ?? groupTitle(edition, group.id, locale)}
                        </span>
                    </PickButton>
                </li>
            );
        })}
    </ul>
);

const CardButton = ({
    card,
    active,
    label,
    onClick,
}: {
    card: ResolvedCard;
    active: boolean;
    label: string;
    onClick: () => void;
}) => {
    const t = useTranslation();

    return (
        <PickButton
            active={active}
            onClick={onClick}
            className={cn(
                'flex min-h-12 w-full cursor-pointer items-start gap-2 rounded-control border-2 border-ink px-3 py-2 text-left text-sm',
                active
                    ? 'bg-ink text-paper'
                    : card.extra
                      ? 'border-dashed bg-paper text-ink'
                      : 'bg-card text-ink',
            )}
        >
            <span
                className={cn(
                    'line-clamp-2 min-w-0 flex-1',
                    card.text === '' && !active && 'text-ink-soft italic',
                )}
            >
                {label}
            </span>
            {card.extra && (
                <span
                    className={cn(
                        'flex-none rounded-full border px-1.5 text-[11px] leading-4 font-extrabold tracking-wide uppercase',
                        active ? 'border-paper' : 'border-ink bg-warning',
                    )}
                >
                    {t('friend.extra_card')}
                </span>
            )}
        </PickButton>
    );
};

const NewCardButton = ({
    deck,
    selected,
    onSelect,
}: {
    deck: 'chance' | 'chest';
    selected: string;
    onSelect: (key: string) => void;
}) => {
    const t = useTranslation();

    return (
        <li>
            <PickButton
                active={selected === newCardKey(deck)}
                onClick={() => onSelect(newCardKey(deck))}
                className={cn(
                    'flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-control border-2 border-dashed border-ink px-3 py-2 text-left text-sm font-semibold',
                    selected === newCardKey(deck)
                        ? 'bg-ink text-paper'
                        : 'bg-board text-ink',
                )}
            >
                <span
                    aria-hidden="true"
                    className="font-display text-xl leading-none"
                >
                    +
                </span>
                {t('friend.new_card')}
            </PickButton>
        </li>
    );
};

const CardList = ({
    edition,
    selected,
    onSelect,
    locale,
    decks,
    cardsHidden,
}: PickProps & {
    locale: Locale;
    decks: Record<'chance' | 'chest', ResolvedCard[]>;
    cardsHidden: boolean;
}) => {
    const t = useTranslation();

    return (
        <div className="flex flex-col gap-4">
            {(['chance', 'chest'] as const).map((deck) => (
                <div key={deck} className="flex flex-col gap-2">
                    <h3 className="m-0 font-display text-lg font-extrabold">
                        {deckLabel(edition, deck, locale)}
                    </h3>
                    <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                        {decks[deck].map((card) => {
                            // Extra cards (B135) follow the standard 16, with their own number.
                            const key = `card.${card.id}`;

                            return (
                                <li key={key}>
                                    <CardButton
                                        card={card}
                                        active={selected === key}
                                        label={
                                            cardsHidden
                                                ? elementLabel(
                                                      key,
                                                      edition,
                                                      locale,
                                                  )
                                                : card.text === ''
                                                  ? t('friend.extra_card_empty')
                                                  : card.text
                                        }
                                        onClick={() => onSelect(key)}
                                    />
                                </li>
                            );
                        })}
                        {nextExtraCardKey(edition, deck) !== undefined && (
                            <NewCardButton
                                deck={deck}
                                selected={selected}
                                onSelect={onSelect}
                            />
                        )}
                    </ul>
                </div>
            ))}
        </div>
    );
};

const PawnList = ({
    pawns,
    selected,
    onSelect,
}: Omit<PickProps, 'edition'> & {
    pawns: { index: number; name: string }[];
}) => (
    <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
        {pawns.map((pawn) => {
            const key = pawnKey(pawn.index);

            return (
                <li key={key}>
                    <PickButton
                        active={selected === key}
                        onClick={() => onSelect(key)}
                        className={cn(
                            'min-h-12 w-full cursor-pointer rounded-control border-2 border-ink px-3 py-2 text-left font-semibold',
                            selected === key
                                ? 'bg-ink text-paper'
                                : 'bg-card text-ink',
                        )}
                    >
                        {pawn.name}
                    </PickButton>
                </li>
            );
        })}
    </ul>
);

export const PickTab = ({
    tab,
    edition,
    resolved,
    locale,
    selected,
    cardsHidden,
    onSelect,
}: PickProps & {
    tab: Tab;
    resolved: ResolvedEdition;
    locale: Locale;
    cardsHidden: boolean;
}) => {
    const t = useTranslation();

    switch (tab) {
        case 'board':
            return (
                <>
                    <p className="m-0 text-sm text-ink-soft">
                        {t('friend.pick_hint')}
                    </p>
                    <BoardNavigator
                        edition={edition}
                        interfaceLanguage={locale}
                        selected={selected}
                        onSelect={onSelect}
                        warned={NO_WARNINGS}
                        selectable={pickable}
                    />
                </>
            );
        case 'towns':
            return (
                <TownList
                    edition={edition}
                    selected={selected}
                    onSelect={onSelect}
                    locale={locale}
                />
            );
        case 'cards':
            return (
                <CardList
                    edition={edition}
                    selected={selected}
                    onSelect={onSelect}
                    locale={locale}
                    decks={{
                        chance: resolved.decks?.chance ?? [],
                        chest: resolved.decks?.chest ?? [],
                    }}
                    cardsHidden={cardsHidden}
                />
            );
        case 'pawns':
            return (
                <PawnList
                    pawns={resolved.pawns ?? []}
                    selected={selected}
                    onSelect={onSelect}
                />
            );
    }
};
